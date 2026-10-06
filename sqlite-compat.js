// Tiny wrapper giving node's built-in SQLite (node:sqlite, Node 22.5+) the callback API this app uses.
// Replaces the 'sqlite3' package, which needs C++ build tools on Windows.
const { DatabaseSync } = require('node:sqlite');
class Stmt { constructor(s){this.s=s} run(...a){const cb=typeof a[a.length-1]==='function'?a.pop():null;let ctx={};try{const r=this.s.run(...a);ctx={lastID:Number(r.lastInsertRowid),changes:r.changes}}catch(e){if(cb)return cb.call({},e);throw e}if(cb)cb.call(ctx,null);return this} finalize(cb){if(cb)cb()} }
class Database { constructor(p){this.d=new DatabaseSync(p)}
 serialize(f){f&&f()} 
 _a(a){const cb=typeof a[a.length-1]==='function'?a.pop():null;let p=a.flat();return[p,cb]}
 run(sql,...a){const[p,cb]=this._a(a);let ctx={};try{const r=this.d.prepare(sql).run(...p);ctx={lastID:Number(r.lastInsertRowid),changes:r.changes}}catch(e){if(cb)return cb.call({},e);throw e}if(cb)cb.call(ctx,null);return this}
 get(sql,...a){const[p,cb]=this._a(a);try{cb&&cb(null,this.d.prepare(sql).get(...p))}catch(e){cb&&cb(e)}}
 all(sql,...a){const[p,cb]=this._a(a);try{cb&&cb(null,this.d.prepare(sql).all(...p))}catch(e){cb&&cb(e)}}
 prepare(sql){return new Stmt(this.d.prepare(sql))}
 close(){} }
module.exports={Database};
