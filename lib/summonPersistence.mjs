export async function persistChargedSummon({ debit, savePending, hasPending, refund }) {
  const wallet = await debit();
  if (!wallet) return { status: "insufficient" };
  try {
    await savePending();
    return { status: "saved", wallet };
  } catch (error) {
    try {
      if (await hasPending()) return { status: "saved", wallet };
    } catch {
      // A read failure cannot prove that the write did not reach MongoDB.
      // Do not blindly refund; that could grant a free card.
      return { status: "uncertain", wallet, error };
    }
    try {
      await refund();
      return { status: "refunded", wallet, error };
    } catch (refundError) {
      return { status: "refund_failed", wallet, error, refundError };
    }
  }
}
