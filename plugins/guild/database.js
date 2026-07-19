/**
 * KELIN MD — Guild database helpers
 * Re-exports economy database functions so guild plugins can import from ./database.js
 */
export {
  getUser,
  saveUser,
  getAllUsers,
  isRegistered,
  registerUser,
  requireRegistration,
  addHistory,
  setStaffLevel,
  removeStaffLevel,
  getStaffMembers,
  DEFAULTS,
} from "../economy/database.js";
