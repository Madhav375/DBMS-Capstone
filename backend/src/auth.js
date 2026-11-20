
import jwt from 'jsonwebtoken';
export function requireAuth(req,res,next){
  const token=req.cookies?.nexora_token;
  if(!token) return res.status(401).json({error:'Please log in to continue.'});
  try { req.user=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch { res.clearCookie('nexora_token'); return res.status(401).json({error:'Your session has expired. Please log in again.'}); }
}
export function requireAdmin(req,res,next){
  if(req.user?.role!=='admin') return res.status(403).json({error:'Admin permission required.'});
  next();
}
