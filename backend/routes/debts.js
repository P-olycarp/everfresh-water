const express = require('express');
const db = require('../db');
const { requireAdmin, requireUser } = require('../middleware/auth');

const router = express.Router();

/* -------------------------------------------------- */
/* GET ALL DEBTS */
/* -------------------------------------------------- */

router.get('/', requireUser, (req, res) => {

    const { from, to, status, source } = req.query;

    let sql = `
        SELECT *
        FROM debts
        WHERE 1=1
    `;

    const params = [];

    if (from) {
        sql += ' AND debt_date >= ?';
        params.push(from);
    }

    if (to) {
        sql += ' AND debt_date <= ?';
        params.push(to);
    }

    if (status) {
        sql += ' AND status = ?';
        params.push(status);
    }

    if (source) {
        sql += ' AND source = ?';
        params.push(source);
    }

    sql += `
        ORDER BY
            status ASC,
            debt_date DESC,
            id DESC
    `;

    res.json(
        db.prepare(sql).all(...params)
    );

});

/* -------------------------------------------------- */
/* GET ONE */
/* -------------------------------------------------- */

router.get('/:id', requireUser, (req, res) => {

    const debt = db.prepare(`
        SELECT *
        FROM debts
        WHERE id = ?
    `).get(req.params.id);

    if (!debt) {
        return res.status(404).json({
            error: 'Debt not found'
        });
    }

    res.json(debt);

});

/* -------------------------------------------------- */
/* CREATE */
/* -------------------------------------------------- */

router.post('/', requireUser, (req, res) => {

    const {
        debt_date,
        customer_name,
        amount,
        source = 'water',
        notes
    } = req.body;

    if (
        !debt_date ||
        !customer_name ||
        amount == null
    ) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    if (amount < 0) {
        return res.status(400).json({
            error: 'Amount cannot be negative'
        });
    }

    const result = db.prepare(`
        INSERT INTO debts
        (
            debt_date,
            customer_name,
            amount,
            source,
            notes
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        debt_date,
        customer_name,
        amount,
        source,
        notes || null
    );

    res.status(201).json(
        db.prepare(`
            SELECT *
            FROM debts
            WHERE id = ?
        `).get(result.lastInsertRowid)
    );

});

/* -------------------------------------------------- */
/* MARK AS PAID */
/* -------------------------------------------------- */

router.patch('/:id/pay', requireUser, (req, res) => {

    const existing = db.prepare(`
        SELECT *
        FROM debts
        WHERE id = ?
    `).get(req.params.id);

    if (!existing) {
        return res.status(404).json({
            error: 'Debt not found'
        });
    }

    const paid_date =
        req.body.paid_date ||
        new Date().toISOString().slice(0, 10);

    db.prepare(`
        UPDATE debts
        SET
            status = 'paid',
            paid_date = ?
        WHERE id = ?
    `).run(
        paid_date,
        req.params.id
    );

    res.json(
        db.prepare(`
            SELECT *
            FROM debts
            WHERE id = ?
        `).get(req.params.id)
    );

});

/* -------------------------------------------------- */
/* UPDATE (ADMIN ONLY) */
/* -------------------------------------------------- */

router.put('/:id', requireAdmin, (req, res) => {

    const existing = db.prepare(`
        SELECT *
        FROM debts
        WHERE id = ?
    `).get(req.params.id);

    if (!existing) {
        return res.status(404).json({
            error: 'Debt not found'
        });
    }

    const updated = {
        ...existing,
        ...req.body
    };

    db.prepare(`
        UPDATE debts
        SET
            debt_date = ?,
            customer_name = ?,
            amount = ?,
            source = ?,
            status = ?,
            paid_date = ?,
            notes = ?
        WHERE id = ?
    `).run(
        updated.debt_date,
        updated.customer_name,
        updated.amount,
        updated.source,
        updated.status,
        updated.paid_date,
        updated.notes,
        req.params.id
    );

    res.json(
        db.prepare(`
            SELECT *
            FROM debts
            WHERE id = ?
        `).get(req.params.id)
    );

});

/* -------------------------------------------------- */
/* DELETE (ADMIN ONLY) */
/* -------------------------------------------------- */

router.delete('/:id', requireAdmin, (req, res) => {

    const result = db.prepare(`
        DELETE
        FROM debts
        WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
        return res.status(404).json({
            error: 'Debt not found'
        });
    }

    res.json({
        success: true,
        message: 'Debt deleted'
    });

});

module.exports = router;