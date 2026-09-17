const b = require('bcryptjs');
console.log('bcryptjs module kind:', typeof b, '| .hash:', typeof b.hash, '| .hashSync:', typeof b.hashSync, '| default?', !!b.default);
const j = require('jsonwebtoken');
console.log('jsonwebtoken .sign:', typeof j.sign, '| default?', !!j.default);