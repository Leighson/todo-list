const express = require('express');
const bodyParser = require('body-parser');
// const date = require(__dirname + '/date.js');
const mongoose = require("mongoose");
const _ = require("lodash");

const PORT = 3000;
const app = express();

require('dotenv').config();
const SERVER_USERID = process.env.ORIGIN_USERID;
const SERVER_KEY = process.env.ORIGIN_KEY;
const DATABASE_NAME = "todolistDB"

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

/*SET SCHEMAS */
const ItemsSchema = {
    name: String
};

const ListSchema = {
    name: String,
    items: [ItemsSchema]
};

/* DEFINE COLLECTIONS */
const Item = mongoose.model("Item", ItemsSchema);
const List = mongoose.model("List", ListSchema);

/* SET DEFAULT ITEMS for ITEMS COLLECTION */
const item1 = new Item({
    name: "Welcome to your todolist!"
});

const item2 = new Item({
    name: "Hit the + button to add a new item"
});

const item3 = new Item({
    name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];


/* MONGODB CONNECT FUNCTION */
async function mongoConnect(customList) {
    await mongoose.connect(`mongodb+srv://${SERVER_USERID}:${SERVER_KEY}@origin.howe4yr.mongodb.net/${DATABASE_NAME}`);
    // console.log(SERVER_USERID, " ", SERVER_KEY);
    console.log(`Mongo database connected to ${customList}.`);
};


/* ROOT */
app.get("/", async (req, res) => {

    try {
        mongoConnect("Today");
    } catch (err) {
        console.log(err);
    }

    /* POPULATE DB IF EMPTY */
    try {
        const items = await Item.find();

        if (items.length === 0) {
            await Item.insertMany(defaultItems);
            res.redirect("/");
        } else {
            res.render('list', {
                listTitle: "Today",
                newListItems: items,
            });
        }
    } catch (err) {
        console.log(err);
    }

});


/* DYNAMIC LISTS */
app.get("/:list", async (req, res) => {

    const listName = req.params.list.toLowerCase();
    let list = null;

    try {
        mongoConnect(_.startCase(req.params.list));
    } catch (err) {
        console.log("err");
    }

    try {
        list = await List.findOne({name: listName});

        if (!list) {

            console.log("Doesn't exist...")

            list = new List ({
                name: listName,
                items: defaultItems
            });

            console.log(`Creating new list: ${_.startCase(listName)}`);
            await list.save();
            console.log("List created!")
            
            console.log("Refreshing page...")
            res.redirect(`/${listName}`);

        } else if (list.items.length === 0) {

            console.log("Empty list!");

            await List.findOneAndUpdate(
                { name: _.toLower(listName) },
                { $push:
                    { items: defaultItems}
                }
            );

            res.redirect(`/${listName}`);

        } else {

            console.log(`Connecting to existing list: ${_.startCase(listName)}`);
            res.render("list", {
                listTitle: _.startCase(list.name),
                newListItems: list.items
            });

        }
    } catch(err) {
        console.log(err);
    }


});

app.post("/", async (req, res) => {

    const itemName = req.body.newItem;
    const listName = req.body.list;

    /* CONNECT TO MONGO */
    try {
        mongoConnect(listName);
    } catch (err) {
        console.log(err);
    }

    /* ADD ITEMS */
    const item = new Item({
        name: itemName
    });

    if (listName === "Today") {

        try {
            await item.save();
            res.redirect("/");
        } catch(err) {
            console.log(err);
        }
        
    } else {

        try {
            const list = await List.findOne({name: _.toLower(listName)});
            console.log(list);
            await list.items.push(item);
            await list.save();
            res.redirect(`/${_.toLower(listName)}`);
        } catch(err) {
            console.log(err);
        }

    }

});

app.post("/delete", async (req, res) => {
    
    const listName = req.body.list;
    const checkedItemId = req.body.checkbox;

    try {
        mongoConnect(listName);
    } catch (err) {
        console.log(err);
    }

    if (listName === "Today") {

        try {
            await Item.findByIdAndRemove(checkedItemId);
            console.log("Successfully deleted the item.");
            res.redirect("/");
        } catch(err) {
            console.log(err);
        }

    } else {
        try {
            await List.findOneAndUpdate(
                { name: _.toLower(listName) },
                { $pull: {
                    items: {
                        _id: checkedItemId
                    }
                }}
            );
            
            console.log("Successfully deleted the item.");
            res.redirect(`/${_.toLower(listName)}`);
        } catch(err) {
            console.log(err);
        }
    }

});

app.get('/about', (req, res) => {
    res.render('about', {});
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}.`);
});