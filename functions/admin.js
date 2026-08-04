// ========================================
// hawaa.in Cloud Functions — admin portal core
//
// Roles, the permission matrix, and validation for every privileged
// action. Kept free of Firebase imports so test/run-tests.js can
// exercise all of it with plain node.
//
// The matrix here is the single source of truth. firestore.rules
// mirrors the *read* half of it; this file governs every write, because
// admin mutations never touch Firestore directly from the browser —
// they go through the adminAction callable, which checks permission and
// writes the audit entry in the same transaction.
// ========================================

'use strict';

// Ordered least → most privileged. The order is meaningful:
// rankOf() uses it so a Super Admin cannot be demoted by a Manager.
const ROLES = ['viewer', 'staff', 'manager', 'super_admin'];

const PERMISSIONS = {
    super_admin: [
        'orders.read', 'orders.readPii', 'orders.updateStatus', 'orders.cancel',
        'reviews.read', 'reviews.moderate',
        'tickets.read', 'export', 'dashboard',
        'team.manage', 'audit.read'
    ],
    manager: [
        'orders.read', 'orders.readPii', 'orders.updateStatus', 'orders.cancel',
        'reviews.read', 'reviews.moderate',
        'tickets.read', 'export', 'dashboard'
    ],
    staff: [
        'orders.read', 'orders.readPii', 'orders.updateStatus',
        'tickets.read'
    ],
    viewer: [
        'orders.read', 'dashboard'
    ]
};

// Order lifecycle. A status may only move to one of its listed
// successors, so a delivered order can never silently return to
// 'placed' and a cancelled order is terminal.
const ORDER_TRANSITIONS = {
    placed: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
};

const REVIEW_STATUSES = ['approved', 'rejected'];

function isRole(role) {
    return typeof role === 'string' && ROLES.indexOf(role) !== -1;
}

function rankOf(role) {
    return ROLES.indexOf(role);
}

function can(role, permission) {
    if (!isRole(role)) return false;
    return PERMISSIONS[role].indexOf(permission) !== -1;
}

// E.164, matching isValidPhone() in firestore.rules. Admin invites are
// keyed by this string, so it must be exact — '+919876543210', never
// '9876543210' or '+91 98765 43210'.
function normalisePhone(phone) {
    if (typeof phone !== 'string') return null;
    const trimmed = phone.replace(/[\s-]/g, '');
    if (!/^\+[1-9][0-9]{7,14}$/.test(trimmed)) return null;
    return trimmed;
}

function isValidName(name) {
    return typeof name === 'string' && name.trim().length >= 1 &&
        name.trim().length <= 100;
}

// ---- Invite validation (Super Admin → pending admin_invites doc) ----

function validateInvite(payload) {
    const data = payload || {};
    const phone = normalisePhone(data.phone);
    if (!phone) {
        throw new Error('Enter a valid mobile number including country code, e.g. +919876543210.');
    }
    if (!isValidName(data.name)) {
        throw new Error('Enter the person\'s name (1-100 characters).');
    }
    if (!isRole(data.role)) {
        throw new Error('Pick a role: viewer, staff, manager or super_admin.');
    }
    return { phone, name: data.name.trim(), role: data.role };
}

// A Super Admin is the only role that may grant access, and nobody may
// grant a role above their own — this stops a compromised Manager
// account from minting a Super Admin.
function assertCanAssign(actorRole, targetRole) {
    if (!can(actorRole, 'team.manage')) {
        throw new Error('Only a Super Admin can manage team access.');
    }
    if (!isRole(targetRole)) {
        throw new Error('Unknown role.');
    }
    if (rankOf(targetRole) > rankOf(actorRole)) {
        throw new Error('You cannot grant a role higher than your own.');
    }
}

// Removing your own Super Admin access, or demoting yourself, would
// leave the portal unmanageable if you were the last one.
function assertNotLastSuperAdmin(targetUid, actorUid, superAdminCount) {
    if (targetUid === actorUid && superAdminCount <= 1) {
        throw new Error('You are the only Super Admin — promote someone else first.');
    }
}

// ---- Order status transitions ----

function validateOrderTransition(currentStatus, nextStatus, actorRole) {
    if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, currentStatus)) {
        throw new Error(`Order is in an unrecognised state (${currentStatus}).`);
    }
    if (ORDER_TRANSITIONS[currentStatus].indexOf(nextStatus) === -1) {
        throw new Error(`An order cannot move from ${currentStatus} to ${nextStatus}.`);
    }
    const permission = nextStatus === 'cancelled' ? 'orders.cancel' : 'orders.updateStatus';
    if (!can(actorRole, permission)) {
        throw new Error('Your role cannot make that change.');
    }
    return nextStatus;
}

// ---- Review moderation ----

function validateReviewDecision(decision, verified, actorRole) {
    if (!can(actorRole, 'reviews.moderate')) {
        throw new Error('Your role cannot moderate reviews.');
    }
    if (REVIEW_STATUSES.indexOf(decision) === -1) {
        throw new Error('Decision must be approved or rejected.');
    }
    if (typeof verified !== 'boolean') {
        throw new Error('The verified flag must be true or false.');
    }
    // "Verified Purchase" is a claim about a real order; it makes no
    // sense on a review that is being rejected.
    if (decision === 'rejected' && verified) {
        throw new Error('A rejected review cannot be marked as a verified purchase.');
    }
    return { status: decision, verified };
}

// ---- PII masking (Viewer role) ----
// A Viewer sees volume and revenue but never enough to contact or
// locate a customer.

function maskPhone(phone) {
    if (typeof phone !== 'string' || phone.length < 4) return '';
    return phone.slice(0, 3) + '•'.repeat(Math.max(0, phone.length - 5)) +
        phone.slice(-2);
}

function maskOrderForViewer(order) {
    const source = order || {};
    const address = source.address || {};
    return {
        qtyPurifierOnetime: source.qtyPurifierOnetime,
        qtyPurifierSubscribe: source.qtyPurifierSubscribe,
        qtyFilter: source.qtyFilter,
        subtotal: source.subtotal,
        gst: source.gst,
        total: source.total,
        paymentMethod: source.paymentMethod,
        status: source.status,
        createdAt: source.createdAt,
        // Coarse location only: useful for demand patterns, useless for
        // identifying or contacting anyone.
        address: {
            city: address.city,
            state: address.state,
            phone: maskPhone(address.phone)
        }
    };
}

// Applied to every read path that serves a role without
// 'orders.readPii'.
function projectOrder(order, role) {
    return can(role, 'orders.readPii') ? order : maskOrderForViewer(order);
}

// ---- Dashboard summary ----
// The shop runs on Indian time, so "today" must mean the IST day, not
// the UTC day. Getting this wrong would make every order placed after
// 5:30am IST count as yesterday's.

const IST_OFFSET_MS = ((5 * 60) + 30) * 60 * 1000;

function istDayStartMs(nowMs) {
    const shifted = nowMs + IST_OFFSET_MS;
    return (Math.floor(shifted / 86400000) * 86400000) - IST_OFFSET_MS;
}

// Cancelled orders still count as orders placed, but never as revenue.
function summariseOrders(orders, nowMs) {
    const dayStart = istDayStartMs(nowMs);
    const weekStart = dayStart - (6 * 86400000); // today plus the previous six days
    const summary = {
        ordersToday: 0,
        revenueToday: 0,
        ordersWeek: 0,
        revenueWeek: 0,
        awaitingDispatch: 0
    };

    (orders || []).forEach(function (order) {
        if (!order || typeof order.createdAtMs !== 'number') return;
        const total = typeof order.total === 'number' ? order.total : 0;
        const earnsRevenue = order.status !== 'cancelled';

        if (order.createdAtMs >= dayStart) {
            summary.ordersToday += 1;
            if (earnsRevenue) summary.revenueToday += total;
        }
        if (order.createdAtMs >= weekStart) {
            summary.ordersWeek += 1;
            if (earnsRevenue) summary.revenueWeek += total;
        }
        if (order.status === 'placed' || order.status === 'confirmed') {
            summary.awaitingDispatch += 1;
        }
    });

    return summary;
}

module.exports = {
    ROLES,
    PERMISSIONS,
    ORDER_TRANSITIONS,
    IST_OFFSET_MS,
    istDayStartMs,
    summariseOrders,
    isRole,
    rankOf,
    can,
    normalisePhone,
    isValidName,
    validateInvite,
    assertCanAssign,
    assertNotLastSuperAdmin,
    validateOrderTransition,
    validateReviewDecision,
    maskPhone,
    maskOrderForViewer,
    projectOrder
};
