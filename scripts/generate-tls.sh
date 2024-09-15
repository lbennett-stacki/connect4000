cd ./tls
mkcert -install
mkcert localhost 127.0.0.1 ::1
mkdir -p tls
mv localhost+2.pem tls/cert.pem
mv localhost+2-key.pem tls/key.pem
cd ../
