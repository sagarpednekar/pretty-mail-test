module.exports = {
  web: {
    client_id:
      "395188174859-mmrb1b3ae6shseo9vm0frs2jcj0o4j4s.apps.googleusercontent.com",
    project_id: "node-email-cms",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_secret: "0Zojb9G757CFYKooByEv-Xic",
    redirect_uris: ["http://localhost:3000/auth/google/callback"],
    javascript_origins: ["http://localhost:3000"],
  },
};
