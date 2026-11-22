const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const userModel = require("../models/user.model");
const mongoose = require("mongoose");
const transcationModel = require("../models/transaction.model");

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
  /**
   * 1- Validate Request
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "fromAccount, toAccount, amount and idempotencyKey are required",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({
      message: "Invalid fromAccount or toAccount",
    });
  }

  /**
   * 2- Validate idempotency key
   */

  const transactionAlreadyExist = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (transactionAlreadyExist) {
    if (transactionAlreadyExist.status == "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: transactionAlreadyExist,
      });
    }

    if (transactionAlreadyExist.status == "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }

    if (transactionAlreadyExist.status == "FAILED") {
      return res.status(500).json({
        message: "Transaction processing failed, please retry",
      });
    }

    if (transactionAlreadyExist.status == "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed, please retry",
      });
    }
  }

  /**
   * 3- Check account status
   */

  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message:
        "Both fromAccount and toAccount must be ACTIVE to process transaction",
    });
  }

  /**
   * 4- Derive sender balance from ledger
   */

  const balance = await fromUserAccount.getBalance();

  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance} and Requested amount is ${amount}`,
    });
  }

  let transaction;
  try {

  
  /**
   * 5- Create transaction (PENDING)
   */

    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (await transactionModel.create(
      [ {
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING",
      } ], { session }))[0];

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await (()=> {
      return new Promise((resolve) => setTimeout(resolve, 15 * 1000))
    })()

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED"},
      { session }
    )

    await session.commitTransaction();
    session.endSession();

  } catch(err) {
        return res.status(400).json({
            message: "Transaction is pending due to some issue, please try after some time"
        })
  }
  /**
   * 10- Send email notification
   */

  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toAccount,
  );

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
    });
  }

//   console.log("Received toAccount:", toAccount);

//   console.log("Is valid ObjectId:", mongoose.Types.ObjectId.isValid(toAccount));

  const toUserAccount = await accountModel.findById(toAccount);

//   console.log("Account found:", toUserAccount);

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Invalid toAccount",
    });
  }

//   console.log("req.user:", req.user);
//   console.log("Authenticated user ID:", req.user?._id);

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });

//   console.log("System account lookup result:", fromUserAccount);

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System User account not found",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initaial fundstTransaction completed successfully",
    transaction: transaction,
  });
}

module.exports = { createTransaction, createInitialFundsTransaction };
