package shared

type User struct {
	Id                 string
	Name               string
	NumberOfOrders     int
	TotalValueOfOrders float64
}

var Users = []User{
	{Id: "U1", Name: "John"},
	{Id: "U2", Name: "Jim"},
	{Id: "U3", Name: "Arnold"},
	{Id: "U4", Name: "Jack"},
}
