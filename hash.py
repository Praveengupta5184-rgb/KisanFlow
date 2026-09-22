import bcrypt

password = b'KapurthalaOfficer@123'
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt)
print(hashed.decode())
