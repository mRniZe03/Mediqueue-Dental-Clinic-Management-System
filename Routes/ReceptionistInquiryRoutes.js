const express = require("express");
const router = express.Router();
const c = require("../Controllers/ReceptionistInquiryController");

// Base: /receptionist/inquiries
router.get("/", c.listForReceptionist);        // READ (list)
// read by subject (contains/exact/prefix)
router.get("/subject", c.listBySubject);
router.get("/:code", c.getOneForReceptionist); // READ (single)
router.post("/:code/reply", c.replyAsReceptionist); // REPLY (append-only)

module.exports = router;
