const https = require('https');

/**
 * Request generic function
 * @param {Object} options can be standard http.request object or include object.url as string
 * @param {Object} || {String} data to write to request
 */
async function request(options, data){
    return new Promise(function(resolve, reject) {
        let _response = {
            statusCode: 200, body : ""
        };
        data = (typeof data==="object") ? JSON.stringify(data) : data;
        const cb = (res) => {
            res.on('data', (d) => _response.body += d.toString());
            res.on('end', () => resolve(_response));
        };
        const req = (typeof options.url==="string") ? https.request(options.url, cb) : https.request(options, cb);
        req.on('error', (error) => {
            _response.statusCode = 500;
            _response.body = error;
            reject(_response);
        });
        req.write(data || '');
        req.end();
    });      
}

/** 
 * Git actions
 * 
 * @param {String} action "push", "del", "get"
 * @param {String} file path of the file to manage
 * @param {Object} data {"message", "branch", "sha"} > "sha" key for update or delete a file
 * @param {String} content for "push"
 */
async function git(action, file, data, content){
  const project = process.env.GITHUB_PROJECTID;
  const owner = process.env.GITHUB_OWNER || "";
  const token =  "token " + process.env.GITHUB_TOKEN;
  const auth_header = "Authorization";

  data =  data || {
    "branch": "master", 
    "message": "no message"
  };
 
  let options = {
    'hostname': "api.github.com",
    'port': 443,
    'headers': {
      'Content-Type': 'application/json'
    }
  };

  switch(action){
    case "push":
      data.content = Buffer.from(content).toString("base64");
      options.method = "PUT";
      break;
    case "del":
      options.method = "DELETE";
      break;
    default:
      options.method = "GET";
  }

  data = JSON.stringify(data);

  options.headers[auth_header] = token;
  options.headers["user-agent"] = "nodejs function";
  options.path = `/repos/${owner}/${project}/contents/${file}`;
  options.headers["content-length"] = data.length;

  return await request(options, data);  
}


exports.request = request;
exports.git = git;

