// Exports something that isn't a valid SquadronPlugin - no `name` field.
export default {
  registerTools() {
    // never reached - the loader should reject this before invoking any hook
  },
};
