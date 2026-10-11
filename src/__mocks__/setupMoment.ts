import moment from "moment";

// Obsidian provides window.moment at runtime; give tests the same global.
window.moment = moment;
