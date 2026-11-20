
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from './db.js';
const {ADMIN_NAME,ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
if(!ADMIN_NAME||!ADMIN_EMAIL||!ADMIN_PASSWORD||ADMIN_PASSWORD.length<12){
 console.error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in backend/.env before setup.');
 process.exit(1);
}
try{
 const hash=await bcrypt.hash(ADMIN_PASSWORD,12);
 await pool.execute("INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES(?,?,?,'admin',1) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),password_hash=VALUES(password_hash),role='admin',is_active=1",[ADMIN_NAME,ADMIN_EMAIL.toLowerCase(),hash]);
 console.log('Initial admin account is ready. You can now log in.');
}finally{await pool.end();}
