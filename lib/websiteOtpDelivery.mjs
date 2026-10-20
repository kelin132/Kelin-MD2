/**
 * Website OTPs are never delivered by private message.
 *
 * A user retrieves their active code by running `.otp` in a WhatsApp group.
 * Keep these no-op exports temporarily for older launchers that may still
 * import the delivery service during a rolling deployment.
 */
export async function deliverNextWebsiteOtp() {
  return false;
}

export function startWebsiteOtpDelivery() {
  return false;
}

export function stopWebsiteOtpDelivery() {}
