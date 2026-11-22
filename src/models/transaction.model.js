const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a from account"],
        index: true
    },

    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a to account"],
        index: true
    },

    status: {
        type: String,
        enum : {
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "Status can either be PENDING, COMPLETED, FAILED OR REVERSED"
        },
        default: "PENDING"
    },

    amount: {
        type: Number,
        required: [true, "Amount is required for a transaction"],
        min: [0, "Amount cannot be negative"]
    },

    idempotencyKey: {
        type: String,
        required: [true, "Idemapotency Key is required for creating a transaction"],
        index: true,
        unique: true
    }

}, { timestamps: true })

const transcationModel = mongoose.model("transaction", transactionSchema)

module.exports = transcationModel;