// recapture.js
const axios = require("axios");
require("dotenv").config();

const clientId = "AesORae0Q9OHocneI0Wy2-aPzA2fX0LdVIuFmlFNBHILKu5erb8IVCQmwDNuc9YswZRblQsnSeycG25l";
const secret = "EIAXzF1Y8czheWRASL-441hxcWI0OC6MbhjcWSU21NgAMAutpaBAMO22z2U4GpufD3Aa59puTHL7madO";
const ORDER_ID = "7L621564R17262744"; // This is the correct order ID from your webhook

(async () => {
  try {
    console.log("🔐 Getting PayPal access token...");
    const authResponse = await axios({
      method: "post",
      url: "https://api.paypal.com/v1/oauth2/token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: clientId,
        password: secret,
      },
      data: "grant_type=client_credentials",
    });

    const token = authResponse.data.access_token;
    console.log("✅ Token acquired.");

    console.log("💳 Attempting to capture order:", ORDER_ID);

    const captureResponse = await axios.post(
      `https://api.paypal.com/v2/checkout/orders/${ORDER_ID}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Capture Success:", captureResponse.data);
  } catch (error) {
    if (error.response) {
      console.error("❌ Capture failed:", error.response.data);
    } else {
      console.error("❌ General error:", error.message);
    }
  }
})();
