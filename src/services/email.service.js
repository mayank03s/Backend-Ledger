require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};


async function sendRegistrationEmail(userEmail, name) {
    const subject = "Welcome to Backend Ledger";
    const text = `Hello ${name},\n\nThank You for registering at Backend Ledger. We are excited to have you onboard!.\n\nBest Regards,\nThe Backend Ledger Team.`;
    const html = `<p>Hello, ${name}, </p><p>Thank You for registering at Backend Ledger. We are excited to have you onboard!.</p><p>Best Regards, <br>The Backend Ledger Team</p> `

    await sendEmail(userEmail, subject, text, html);
}



async function sendTransactionEmail(userEmail, name, account, toAccount) {
    const subject = "Transaction Successful";

    const text = `Hello ${name},

Your transaction has been completed successfully.

Transaction Details:
From Account: ${account}
To Account: ${toAccount}
Status: Successful

Thank you for using Backend Ledger!

Best Regards,
The Backend Ledger Team.`;

    const html = `
        <p>Hello ${name},</p>
        <p>Your transaction has been completed successfully.</p>
        <h3>Transaction Details:</h3>
        <p><strong>From Account:</strong> ${account}</p>
        <p><strong>To Account:</strong> ${toAccount}</p>
        <p><strong>Status:</strong> Successful</p>
        <p>Thank you for using Backend Ledger!</p>
        <p>Best Regards,<br>The Backend Ledger Team</p>
    `;

    await sendEmail(userEmail, subject, text, html);
}


async function sendTransactionFailureEmail(userEmail, name, account, toAccount) {
    const subject = "Transaction Failed";

    const text = `Hello ${name},

Unfortunately, your transaction could not be completed.

Transaction Details:
From Account: ${account}
To Account: ${toAccount}
Status: Failed

Please try again or contact our support team if the issue persists.

Best Regards,
The Backend Ledger Team.`;

    const html = `
        <p>Hello ${name},</p>
        <p>Unfortunately, your transaction could not be completed.</p>
        <h3>Transaction Details:</h3>
        <p><strong>From Account:</strong> ${account}</p>
        <p><strong>To Account:</strong> ${toAccount}</p>
        <p><strong>Status:</strong> Failed</p>
        <p>Please try again or contact our support team if the issue persists.</p>
        <p>Best Regards,<br>The Backend Ledger Team</p>
    `;

    await sendEmail(userEmail, subject, text, html);
}



module.exports = { sendRegistrationEmail, sendTransactionEmail, sendTransactionFailureEmail };