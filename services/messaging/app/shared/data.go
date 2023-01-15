package shared

type Order struct {
	Id    string
	Value float64
}

var Orders = []Order{
	{Id: "M1", Value: 1000},
	{Id: "M2", Value: 10},
	{Id: "M3", Value: 100},
	{Id: "M4", Value: 500},
}
