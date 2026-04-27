require("dotenv").config();

const connectDB = require("../config/db");
const Item = require("../models/Item");

const sampleItems = [
  {
    name: "Graph Notebook",
    category: "School",
    description: "Used for math notes, formulas, and quick sketches.",
  },
  {
    name: "USB Flash Drive",
    category: "Tech",
    description: "Stores project backups, slide decks, and lab files.",
  },
  {
    name: "Desk Lamp",
    category: "Home",
    description: "Warm light for evening study sessions and reading.",
  },
  {
    name: "Blue Ink Pens",
    category: "School",
    description: "Pack of smooth pens for quizzes, notes, and signatures.",
  },
  {
    name: "Water Bottle",
    category: "Lifestyle",
    description: "Reusable bottle carried to classes and commutes.",
  },
  {
    name: "Portable Charger",
    category: "Tech",
    description: "Keeps phone and earbuds alive during long campus days.",
  },
  {
    name: "Recipe Binder",
    category: "Kitchen",
    description: "Organized collection of favorite home-cooked meal ideas.",
  },
  {
    name: "Sticky Notes",
    category: "Office",
    description: "Helpful for reminders, deadlines, and study prompts.",
  },
  {
    name: "Backpack Rain Cover",
    category: "Travel",
    description: "Protects books and gadgets during rainy commutes.",
  },
  {
    name: "Mechanical Keyboard",
    category: "Tech",
    description: "Comfortable keyboard for coding, writing, and gaming.",
  },
  {
    name: "Index Cards",
    category: "School",
    description: "Useful for flashcards, reviews, and oral recitation prep.",
  },
  {
    name: "Mini Whiteboard",
    category: "Office",
    description: "Great for weekly planning, quick doodles, and to-do lists.",
  },
];

async function seedItems() {
  try {
    await connectDB();

    await Item.deleteMany({});

    const timestampedItems = sampleItems.map((item, index) => {
      const createdAt = new Date(Date.now() - (sampleItems.length - index) * 86400000);

      return {
        ...item,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await Item.insertMany(timestampedItems);

    console.log(`Seeded ${timestampedItems.length} items successfully.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed items:", error.message);
    process.exit(1);
  }
}

seedItems();
