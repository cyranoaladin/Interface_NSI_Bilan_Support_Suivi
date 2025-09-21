const http = require("http");
function req(path, method="GET", data, headers={}){
  return new Promise((res, rej)=>{
    const r = http.request({ host: "localhost", port: 3000, path, method, headers }, resp => {
      let b = ""; resp.on("data", d => b+=d); resp.on("end", () => res({ status: resp.statusCode, headers: resp.headers, body: b }));
    });
    r.on("error", rej);
    if (data) r.end(JSON.stringify(data)); else r.end();
  });
}
(async ()=>{
  const common = { content-type: application/json, x-test-mode: true };
  const login = await req(/api/auth/login, POST, { email: process.env.E2E_STUDENT_EMAIL || alaeddine.benrhouma+eleve_term@ert.tn, password: irrelevant }, common);
  console.log(login, login.status, login.body);
  const cookie = login.headers[set-cookie] || login.headers[set-cookie2];
  const headers = { ...common };
  if (cookie) headers[cookie] = Array.isArray(cookie) ? cookie.join(
