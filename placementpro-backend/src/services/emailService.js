const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/* TEST SMTP LOGIN */
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ SMTP LOGIN FAILED");
    console.log(error);
  } else {
    console.log("✅ SMTP LOGIN SUCCESSFUL - Gmail ready to send emails");
  }
});

async function sendEmail(data) {

  try {

    const info = await transporter.sendMail({
      from: `"PlacementPro" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: data.subject,
      html: data.body
    });

    console.log("Email sent:", info.response);

  } catch (err) {

    console.log("EMAIL SEND ERROR:");
    console.log(err);

    throw err;

  }

}

module.exports = sendEmail;