package main

import (
	"database/sql"
	"log"
	"path"
	"strconv"
)

// User type
type User struct {
	Identity UserIdentity
	DB       *sql.DB
	Secrets  []Secret
}

// Secret type
type Secret struct {
	Account   string
	SecretKey string
	Time      int
	Digits    int
}

// Connect user openning db
func (user *User) Connect() error {
	log.Println("connect")
	user.DB = Init(path.Join(DatabaseFolder, user.Identity.Username)+".db", user.Identity.Password)
	ExecFromFile(user.DB, path.Join(MigrationsFolder, "secrets.sql"))

	user.LoadSecrets()
	return nil
}

// AddSecret to database
func (user *User) AddSecret(secret Secret) error {
	cmd := "INSERT INTO `secrets` (account, secretKey, time, digits) values('" + secret.Account + "', '" + secret.SecretKey + "', " + strconv.Itoa(secret.Time) + ", " + strconv.Itoa(secret.Digits) + ");"
	_, err := user.DB.Exec(cmd)
	if err != nil {
		return err
	}
	return nil
}

// LoadSecrets from database
func (user *User) LoadSecrets() error {
	cmd := "select account, secretKey, time, digits from secrets;"
	rows, err := user.DB.Query(cmd)
	defer rows.Close()
	if err != nil {
		return err
	}

	user.Secrets = make([]Secret, 0)

	for rows.Next() {
		var secret Secret
		rows.Scan(&secret.Account, &secret.SecretKey, &secret.Time, &secret.Digits)
		user.Secrets = append(user.Secrets, secret)
	}
	return nil
}
