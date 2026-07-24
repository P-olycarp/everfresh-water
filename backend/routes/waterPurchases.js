const express = require('express');
const db = require('../db');
const { requireAdmin, requireUser } = require('../middleware/auth');

const router = express.Router();

/* -------------------------------------------------- */
/* GET ALL */
/* -------------------------------------------------- */

router.get('/', requireUser, (req, res) => {

    const { from, to } = req.query;

    let sql = `
        SELECT *
        FROM water_purchases
        WHERE 1 = 1
    `;

    const params = [];

    if (from) {
        sql += ' AND purchase_date >= ?';
        params.push(from);
    }

    if (to) {
        sql += ' AND purchase_date <= ?';
        params.push(to);
    }

    sql += `
        ORDER BY
            purchase_date DESC,
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

    const purchase = db.prepare(`
        SELECT *
        FROM water_purchases
        WHERE id = ?
    `).get(req.params.id);

    if (!purchase) {
        return res.status(404).json({
            error: 'Purchase not found'
        });
    }

    res.json(purchase);

});

/* -------------------------------------------------- */
/* CREATE */
/* -------------------------------------------------- */

router.post('/', requireUser, (req, res) => {

    const {
        purchase_date,
        liters,
        cost,
        supplier,
        paid_from = 'cash',
        notes
    } = req.body;

    if (!purchase_date || cost == null) {
        return res.status(400).json({
            error: 'purchase_date and cost are required'
        });
    }

    if (cost < 0 || (liters != null && liters < 0)) {
        return res.status(400).json({
            error: 'Negative values are not allowed'
        });
    }

    const result = db.prepare(`
        INSERT INTO water_purchases
        (
            purchase_date,
            liters,
            cost,
            supplier,
            paid_from,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        purchase_date,
        liters ?? null,
        cost,
        supplier || null,
        paid_from,
        notes || null
    );

    res.status(201).json(
        db.prepare(`
            SELECT *
            FROM water_purchases
            WHERE id = ?
        `).get(result.lastInsertRowid)
    );

});

/* -------------------------------------------------- */
/* UPDATE (ADMIN ONLY) */
/* -------------------------------------------------- */

router.put('/:id', requireAdmin, (req, res) => {

    const existing = db.prepare(`
        SELECT *
        FROM water_purchases
        WHERE id = ?
    `).get(req.params.id);

    if (!existing) {
        return res.status(404).json({
            error: 'Purchase not found'
        });
    }

    const updated = {
        ...existing,
        ...req.body
    };

    db.prepare(`
        UPDATE water_purchases
        SET
            purchase_date = ?,
            liters = ?,
            cost = ?,
            supplier = ?,
            paid_from = ?,
            notes = ?
        WHERE id = ?
    `).run(
        updated.purchase_date,
        updated.liters,
        updated.cost,
        updated.supplier,
        updated.paid_from,
        updated.notes,
        req.params.id
    );

    res.json(
        db.prepare(`
            SELECT *
            FROM water_purchases
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
        FROM water_purchases
        WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
        return res.status(404).json({
            error: 'Purchase not found'
        });
    }

    res.json({
        success: true,
        message: 'Purchase deleted'
    });

});

module.exports = router;