var http = require("http"),
  fs = require("fs"),
  ccav = require("./ccavutil.js"),
  crypto = require("crypto"),
  qs = require("querystring");

exports.postReq = function (request, response) {
  var body = "",
    workingKey = "", // Your actual working key
    accessCode = "", // Your actual access code
    encRequest = "",
    formbody = "";

  // Generate Md5 hash for the key and then convert in base64 string
  var md5 = crypto.createHash("md5").update(workingKey).digest();
  var keyBase64 = Buffer.from(md5).toString("base64");

  // Initializing Vector and then convert in base64 string
  var ivBase64 = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]).toString("base64");

  request.on("data", function (data) {
    body += data;
  });

  request.on("end", function () {
    try {
      console.log('Request body:', body);
      console.log('Working Key (first 10 chars):', workingKey.substring(0, 10));
      console.log('Access Code:', accessCode);
      
      // Parse form data to check merchant_id
      var formData = qs.parse(body);
      console.log('Merchant ID from form:', formData.merchant_id);
      
      // Validate merchant_id matches your account
      if (formData.merchant_id !== '4371009') {
        console.error('Merchant ID mismatch!');
        return response.end('<html><body>Merchant ID mismatch</body></html>');
      }

      encRequest = ccav.encrypt(body, keyBase64, ivBase64);
      console.log('Encryption successful, length:', encRequest.length);

      // IMPORTANT: Use TEST environment until you get production credentials
      var actionUrl = process.env.NODE_ENV === 'production' 
        ? 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction'  // Keep test for now
        : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';

      formbody =
        '<form id="nonseamless" method="post" name="redirect" action="' + actionUrl + '">' +
        '<input type="hidden" id="encRequest" name="encRequest" value="' + encRequest + '">' +
        '<input type="hidden" name="access_code" id="access_code" value="' + accessCode + '">' +
        '<script language="javascript">document.redirect.submit();</script>' +
        '</form>';

      response.writeHeader(200, { "Content-Type": "text/html" });
      response.write(formbody);
      response.end();
    } catch (error) {
      console.error('Encryption error:', error);
      response.writeHeader(500, { "Content-Type": "text/html" });
      response.write('<html><body>Error processing request: ' + error.message + '</body></html>');
      response.end();
    }
  });
};