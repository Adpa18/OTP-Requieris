package main

import (
	"database/sql"
	"log"
	"path"
)

const (
	dbName       = "accounts.db"
	dbPassphrase = "wggZbPsW4nV9LacUMHZCxMMk"
)

// Accounts type
type Accounts struct {
	db *sql.DB
}

// UserDB type
type UserDB struct {
	User         string
	PasswordHash []byte
}

// Init accounts
func (accounts *Accounts) Init() {
	accounts.db = Init(path.Join(DatabaseFolder, dbName), dbPassphrase)
	ExecFromFile(accounts.db, path.Join(MigrationsFolder, "accounts.sql"))
}

// AddUser to database
func (accounts *Accounts) AddUser(userDB *UserDB) error {
	cmd := "INSERT INTO `users` (user, password_hash) values('" + userDB.User + "','" + string(userDB.PasswordHash) + "');"
	_, err := accounts.db.Exec(cmd)
	if err != nil {
		return err
	}
	return nil
}

// GetPasswordHash by user
func (accounts *Accounts) GetPasswordHash(user string) (passwordHash []byte, err error) {
	cmd := "select password_hash from users where user='" + user + "';"
	rows, err := accounts.db.Query(cmd)
	defer rows.Close()
	if err != nil {
		return []byte{}, err
	}
	rows.Scan(&passwordHash)
	return
}

// ListUsers from db
func (accounts *Accounts) ListUsers() error {
	cmd := "select user, password_hash from users;"
	rows, err := user.DB.Query(cmd)
	defer rows.Close()
	if err != nil {
		log.Println(err)
		return err
	}

	for rows.Next() {
		var user UserDB
		rows.Scan(&user.User, &user.PasswordHash)
		log.Printf("%#v\n", user)
	}
	return nil
}