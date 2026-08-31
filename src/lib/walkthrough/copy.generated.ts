/* eslint-disable */
/**
 * Generated from walkthrough/{demo,trial}/{tour,bn}.xml - do not edit.
 *
 * Run `npm run walkthrough:copy` after changing those files, or just start the
 * dev server, which does it for you. Edits made here are lost on the next run.
 */

export type Words = { en: string; bn: string };
export type StepCopy = { title: Words; body: Words };

export const copy: Record<'demo' | 'trial', {
  missions: Record<string, Words>;
  steps: Record<string, StepCopy>;
}> = {
  "demo": {
    "missions": {
      "sales": {
        "en": "Last month's sales",
        "bn": "গত মাসের বিক্রি"
      },
      "profit": {
        "en": "Profit or loss",
        "bn": "লাভ না লোকসান"
      },
      "stock": {
        "en": "Inventory health",
        "bn": "স্টকের অবস্থা"
      },
      "sale": {
        "en": "Take a sale, end to end",
        "bn": "শুরু থেকে শেষ পর্যন্ত একটি বিক্রি"
      },
      "purchase": {
        "en": "Order stock in",
        "bn": "মাল কিনে আনা"
      },
      "books": {
        "en": "Money in, money out",
        "bn": "আয় ও ব্যয়"
      },
      "again": {
        "en": "Coming back to this tour",
        "bn": "এই গাইডে ফিরে আসা"
      },
      "yours": {
        "en": "Your own restaurant",
        "bn": "আপনার নিজের রেস্টুরেন্ট"
      }
    },
    "steps": {
      "sales.intro": {
        "title": {
          "en": "How much did you sell last month?",
          "bn": "গত মাসে আপনার বিক্রি কত ছিল?"
        },
        "body": {
          "en": "Most owners answer this by adding up a drawer of receipts. Let us do it in three clicks instead - and then read what the number is actually made of.",
          "bn": "বেশিরভাগ মালিক এই হিসাব রসিদের স্তূপ থেকে বের করেন। চলুন তিনটি ক্লিকেই করে ফেলি — আর দেখি সংখ্যাটা আসলে কী দিয়ে তৈরি।"
        }
      },
      "sales.open-reporting": {
        "title": {
          "en": "Open Reporting",
          "bn": "রিপোর্টিং খুলুন"
        },
        "body": {
          "en": "In the main menu. Every report in the product lives behind this one item.",
          "bn": "মূল মেনুতে। পণ্যের সব রিপোর্ট এই একটি জায়গার পেছনেই আছে।"
        }
      },
      "sales.range": {
        "title": {
          "en": "The period, set once",
          "bn": "সময়সীমা, একবারই ঠিক করুন"
        },
        "body": {
          "en": "We have set it to Last Month for you. Every tab on this page obeys it, so you pick the period once and read all thirteen reports against it.",
          "bn": "আপনার জন্য এটি \"গত মাস\" করা হয়েছে। এই পাতার প্রতিটি ট্যাব এটাই মানে, তাই একবার সময় বেছে নিয়ে তেরোটি রিপোর্টই পড়তে পারবেন।"
        }
      },
      "sales.revenue": {
        "title": {
          "en": "That is the month",
          "bn": "এটাই পুরো মাস"
        },
        "body": {
          "en": "Every order from every till, delivery app and counter, added up. Nothing was typed in to produce it.",
          "bn": "প্রতিটি কাউন্টার, ডেলিভারি অ্যাপ আর টিলের সব অর্ডার একসাথে যোগ করা। এটি বের করতে কিছুই টাইপ করতে হয়নি।"
        }
      },
      "sales.collected": {
        "title": {
          "en": "Sold is not the same as collected",
          "bn": "বিক্রি আর আদায় এক নয়"
        },
        "body": {
          "en": "This is the money that actually arrived. The difference between the two tiles is what is still owed to you - the figure most restaurants never see.",
          "bn": "এটি সেই টাকা যা সত্যিই হাতে এসেছে। দুই ঘরের পার্থক্যই আপনার বকেয়া — যা বেশিরভাগ রেস্টুরেন্ট কখনো দেখতেই পায় না।"
        }
      },
      "sales.trend": {
        "title": {
          "en": "And which days did the work",
          "bn": "আর কোন দিনগুলো কাজ করেছে"
        },
        "body": {
          "en": "The same month, day by day. This is the chart that tells you which nights to staff properly and which to close early.",
          "bn": "একই মাস, দিন ধরে ধরে। কোন রাতে বেশি লোক রাখবেন আর কোন রাতে তাড়াতাড়ি বন্ধ করবেন — এই চার্টই বলে দেয়।"
        }
      },
      "sales.done": {
        "title": {
          "en": "You just read a month of trading",
          "bn": "আপনি এক মাসের ব্যবসা পড়ে ফেললেন"
        },
        "body": {
          "en": "Sold, collected, owed, and the shape of the month. Next: whether any of it was profit.",
          "bn": "বিক্রি, আদায়, বকেয়া আর মাসের গতিপ্রকৃতি। এরপর: এর মধ্যে লাভ কতটুকু।"
        }
      },
      "profit.intro": {
        "title": {
          "en": "Revenue is not profit",
          "bn": "বিক্রি মানেই লাভ নয়"
        },
        "body": {
          "en": "A busy month can lose money, and it usually takes an accountant three weeks to say so. Here it is one tab away.",
          "bn": "ব্যস্ত মাসেও লোকসান হতে পারে, আর হিসাবরক্ষক তা বলতে তিন সপ্তাহ নেন। এখানে সেটা এক ট্যাব দূরে।"
        }
      },
      "profit.open-tab": {
        "title": {
          "en": "Click Profit",
          "bn": "প্রফিট-এ ক্লিক করুন"
        },
        "body": {
          "en": "In the row of tabs above. It keeps the period you already chose, so this is still last month.",
          "bn": "উপরের ট্যাবগুলোর সারিতে। আপনার বেছে নেওয়া সময়সীমা বহাল থাকে, তাই এটিও গত মাসেরই হিসাব।"
        }
      },
      "profit.income": {
        "title": {
          "en": "Everything that came in",
          "bn": "যা কিছু এসেছে"
        },
        "body": {
          "en": "Paid orders, plus anything you logged as income by hand - a catering job, a room hire. Both count, so the total is the real one.",
          "bn": "পরিশোধিত অর্ডার, সঙ্গে হাতে লেখা যেকোনো আয় — ক্যাটারিং, হল ভাড়া। দুটোই ধরা হয়, তাই মোটটাই আসল।"
        }
      },
      "profit.expenses": {
        "title": {
          "en": "Everything that went out",
          "bn": "যা কিছু বেরিয়ে গেছে"
        },
        "body": {
          "en": "Your purchase orders and your logged running costs together. Mission 5 and 6 are where these two numbers come from.",
          "bn": "আপনার ক্রয় আদেশ আর লেখা পরিচালন খরচ একসাথে। মিশন ৫ ও ৬-এই এই দুটি সংখ্যা তৈরি হয়।"
        }
      },
      "profit.net": {
        "title": {
          "en": "What you actually kept",
          "bn": "শেষে যা থাকল"
        },
        "body": {
          "en": "One figure, and the only one that decides whether the month was worth opening the doors for.",
          "bn": "একটাই সংখ্যা — মাসটা দরজা খোলার মতো ছিল কি না, সেটা এটাই ঠিক করে।"
        }
      },
      "profit.breakdown": {
        "title": {
          "en": "And where it went",
          "bn": "আর কোথায় গেল"
        },
        "body": {
          "en": "Line by line, so a bad month names its own cause instead of leaving you guessing.",
          "bn": "লাইন ধরে ধরে, যাতে খারাপ মাসের কারণ নিজেই বলে দেয় — অনুমান করতে না হয়।"
        }
      },
      "profit.done": {
        "title": {
          "en": "You now know if last month paid",
          "bn": "গত মাসে লাভ হয়েছে কি না, এখন জানেন"
        },
        "body": {
          "en": "In and out and what is left. Next: whether your storeroom agrees with your books.",
          "bn": "আয়, ব্যয় আর অবশিষ্ট। এরপর: আপনার গুদাম হিসাবের সঙ্গে মেলে কি না।"
        }
      },
      "stock.intro": {
        "title": {
          "en": "What is in the storeroom right now?",
          "bn": "এই মুহূর্তে গুদামে কী আছে?"
        },
        "body": {
          "en": "Running out mid-service costs you the table and the reputation. This screen tells you the day before it happens.",
          "bn": "সার্ভিসের মাঝখানে মাল ফুরালে টেবিলও যায়, সুনামও যায়। এই স্ক্রিন ঘটার আগের দিনই জানিয়ে দেয়।"
        }
      },
      "stock.open-tab": {
        "title": {
          "en": "Click Inventory Health",
          "bn": "ইনভেন্টরি হেলথ-এ ক্লিক করুন"
        },
        "body": {
          "en": "Same row of tabs. This one ignores the date filter on purpose - stock is what you have now, not what you had.",
          "bn": "একই ট্যাবের সারিতে। এটি ইচ্ছে করেই তারিখ ফিল্টার মানে না — স্টক মানে এখন কী আছে, আগে কী ছিল তা নয়।"
        }
      },
      "stock.low": {
        "title": {
          "en": "The only number that needs you today",
          "bn": "আজ যে সংখ্যাটির দিকে তাকাতেই হবে"
        },
        "body": {
          "en": "Items at or under the reorder level you set. If this is not zero, somebody should be on the phone to a supplier.",
          "bn": "আপনার ঠিক করা রি-অর্ডার সীমায় বা তার নিচে থাকা পণ্য। শূন্য না হলে কারও সরবরাহকারীকে ফোন করা উচিত।"
        }
      },
      "stock.value": {
        "title": {
          "en": "Money sitting on the shelves",
          "bn": "তাকের উপর পড়ে থাকা টাকা"
        },
        "body": {
          "en": "Stock is cash you have already spent. Knowing the figure is how you stop over-ordering the things that keep and under-ordering the things that sell.",
          "bn": "স্টক মানে আগেই খরচ করা নগদ। সংখ্যাটি জানলেই যা টেকে তা বেশি কেনা আর যা বিক্রি হয় তা কম কেনা বন্ধ হয়।"
        }
      },
      "stock.table": {
        "title": {
          "en": "Low stock first, always",
          "bn": "কম স্টক সবসময় আগে"
        },
        "body": {
          "en": "The list sorts itself so the trouble is at the top. You can print it as an A4 sheet or a till roll and hand it to whoever does the buying.",
          "bn": "তালিকা নিজেই সাজায় যাতে সমস্যা উপরে থাকে। A4 বা টিল রোলে ছেপে যিনি কেনাকাটা করেন তাঁকে দিতে পারেন।"
        }
      },
      "stock.done": {
        "title": {
          "en": "The storeroom, without walking to it",
          "bn": "গুদামে না গিয়েই গুদামের খবর"
        },
        "body": {
          "en": "That is the reading done. Now the working - and it starts at the till.",
          "bn": "পড়ার পর্ব শেষ। এবার কাজের পর্ব — শুরু কাউন্টার থেকে।"
        }
      },
      "sale.intro": {
        "title": {
          "en": "Ring up an order and get paid for it",
          "bn": "একটি অর্ডার নিন, আর তার টাকা বুঝে নিন"
        },
        "body": {
          "en": "The whole loop: take the order at the till, watch it appear on the orders board, mark it served, and collect the money. Everything you have just been reading is made of this.",
          "bn": "পুরো চক্রটি: কাউন্টারে অর্ডার নেওয়া, অর্ডার বোর্ডে সেটি দেখা, সার্ভ করা হয়েছে বলে চিহ্নিত করা, আর টাকা আদায়। এতক্ষণ যা পড়লেন, সবই এখান থেকেই তৈরি।"
        }
      },
      "sale.open-pos": {
        "title": {
          "en": "Open the POS",
          "bn": "পিওএস খুলুন"
        },
        "body": {
          "en": "This is the screen your counter staff live on all day.",
          "bn": "সারাদিন আপনার কাউন্টারের কর্মীরা এই স্ক্রিনেই থাকেন।"
        }
      },
      "sale.pick-item": {
        "title": {
          "en": "Tap any dish",
          "bn": "যেকোনো খাবারে চাপ দিন"
        },
        "body": {
          "en": "One tap adds it. Tap the same dish again for a second portion - no quantity box, because a counter at seven in the evening has no time for one.",
          "bn": "এক চাপেই যোগ হয়। আরেকটি লাগলে আবার চাপুন — আলাদা করে সংখ্যা লেখার ঘর নেই, কারণ সন্ধ্যা সাতটার কাউন্টারে সে সময় থাকে না।"
        }
      },
      "sale.cart": {
        "title": {
          "en": "The bill builds itself",
          "bn": "বিল নিজেই তৈরি হচ্ছে"
        },
        "body": {
          "en": "Quantities, a note for the kitchen, a discount on one line or on the lot - and the tax and the total recalculated as you go.",
          "bn": "পরিমাণ, রান্নাঘরের জন্য নোট, এক লাইনে বা পুরো বিলে ছাড় — সঙ্গে সঙ্গে কর আর মোট হিসাব বসে যায়।"
        }
      },
      "sale.place": {
        "title": {
          "en": "Place the order",
          "bn": "অর্ডার দিন"
        },
        "body": {
          "en": "It goes to the kitchen screen and the orders board in the same instant. This is a real order in the demo restaurant - go ahead.",
          "bn": "একই মুহূর্তে এটি রান্নাঘরের স্ক্রিন আর অর্ডার বোর্ডে চলে যায়। ডেমো রেস্টুরেন্টে এটি সত্যিকারের অর্ডার — নির্দ্বিধায় দিন।"
        }
      },
      "sale.open-orders": {
        "title": {
          "en": "And here it is, on the board",
          "bn": "আর এই যে, বোর্ডে চলে এসেছে"
        },
        "body": {
          "en": "The till brought you straight here. Dine-in, takeaway and delivery all arrive in this one list, in the order they came in - and Orders, in the main menu, is how you get back to it.",
          "bn": "বিল দেওয়ার সঙ্গে সঙ্গেই এখানে চলে এসেছেন। ডাইন-ইন, টেকঅ্যাওয়ে আর ডেলিভারি — সব এই এক তালিকায়, আসার ক্রম অনুযায়ী। পরে ফিরে আসতে মূল মেনুর \"Orders\"।"
        }
      },
      "sale.badges": {
        "title": {
          "en": "Two badges, two questions",
          "bn": "দুটি ব্যাজ, দুটি প্রশ্ন"
        },
        "body": {
          "en": "Every order carries where the food is up to and whether the money has arrived. They move separately, because in a real restaurant they do.",
          "bn": "প্রতিটি অর্ডার বলে খাবার কোন পর্যায়ে আর টাকা এসেছে কি না। দুটো আলাদাভাবে চলে, কারণ বাস্তব রেস্টুরেন্টেও তাই হয়।"
        }
      },
      "sale.serve": {
        "title": {
          "en": "Move the food along",
          "bn": "খাবারটি এগিয়ে দিন"
        },
        "body": {
          "en": "Press the green button on the ringed order to push it to its next stage - cooking, ready, served. The kitchen screen follows along.",
          "bn": "চিহ্নিত অর্ডারের সবুজ বোতামে চাপ দিয়ে পরের ধাপে নিন — রান্না হচ্ছে, প্রস্তুত, সার্ভ করা হয়েছে। রান্নাঘরের স্ক্রিনও সঙ্গে সঙ্গে বদলায়।"
        }
      },
      "sale.pay": {
        "title": {
          "en": "Collect the payment",
          "bn": "টাকা আদায় করুন"
        },
        "body": {
          "en": "Press Pay on that same order.",
          "bn": "ওই অর্ডারেই \"Pay\" বোতামে চাপ দিন।"
        }
      },
      "sale.payment": {
        "title": {
          "en": "How the money arrived",
          "bn": "টাকা কীভাবে এল"
        },
        "body": {
          "en": "Cash, card or bKash, with room for a transaction id. Or send it out on account - the order stays open as a due, and it is the due that shows up as the gap in your sales report. Take the payment or close the box; either way the tour carries on.",
          "bn": "নগদ, কার্ড বা বিকাশ, সঙ্গে ট্রানজেকশন আইডি লেখার জায়গা। কিংবা বাকিতে ছাড়ুন — অর্ডারটি বকেয়া হিসেবে খোলা থাকে, আর সেই বকেয়াই বিক্রির রিপোর্টে ফাঁক হয়ে দেখা দেয়। টাকা নিন বা বাক্সটি বন্ধ করুন — দুভাবেই গাইড এগিয়ে যাবে।"
        }
      },
      "sale.done": {
        "title": {
          "en": "One sale, all the way through",
          "bn": "একটি বিক্রি, শুরু থেকে শেষ"
        },
        "body": {
          "en": "Taken, cooked, served, paid - and it has already changed the sales and profit figures you read at the start.",
          "bn": "নেওয়া, রান্না, সার্ভ, পরিশোধ — আর শুরুতে যে বিক্রি ও লাভের হিসাব দেখেছিলেন, তা এর মধ্যেই বদলে গেছে।"
        }
      },
      "purchase.intro": {
        "title": {
          "en": "Buying is half of the profit line",
          "bn": "লাভের অর্ধেকটাই কেনাকাটা"
        },
        "body": {
          "en": "A purchase order does three jobs at once: it tells the supplier what you want, it puts the stock on the shelf when it lands, and it puts the cost in the accounts. Let us raise one.",
          "bn": "একটি ক্রয় আদেশ একসাথে তিনটি কাজ করে: সরবরাহকারীকে চাহিদা জানায়, মাল এলে স্টকে তোলে, আর খরচটি হিসাবে বসায়। চলুন একটি তৈরি করি।"
        }
      },
      "purchase.open-inventory": {
        "title": {
          "en": "Open Inventory",
          "bn": "ইনভেন্টরি খুলুন"
        },
        "body": {
          "en": "Items, suppliers, recipes, waste and purchase orders all sit behind this one.",
          "bn": "পণ্য, সরবরাহকারী, রেসিপি, অপচয় আর ক্রয় আদেশ — সবই এর পেছনে।"
        }
      },
      "purchase.open-po": {
        "title": {
          "en": "Go to Purchase Orders",
          "bn": "ক্রয় আদেশে যান"
        },
        "body": {
          "en": "The card for purchase orders, on this page.",
          "bn": "এই পাতায় ক্রয় আদেশের কার্ডটি।"
        }
      },
      "purchase.create": {
        "title": {
          "en": "Start a new order",
          "bn": "নতুন একটি আদেশ শুরু করুন"
        },
        "body": {
          "en": "Create PO, at the top right.",
          "bn": "উপরে ডানদিকে \"Create PO\"।"
        }
      },
      "purchase.supplier": {
        "title": {
          "en": "Who you are buying from",
          "bn": "কার কাছ থেকে কিনছেন"
        },
        "body": {
          "en": "Suppliers are searchable by name or contact. Every order you place against one builds a history you can hold them to.",
          "bn": "সরবরাহকারী নাম বা যোগাযোগ দিয়ে খুঁজে নেওয়া যায়। প্রতিটি আদেশ একটি ইতিহাস গড়ে, যা দিয়ে তাঁদের জবাবদিহি করাতে পারবেন।"
        }
      },
      "purchase.lines": {
        "title": {
          "en": "What you are buying",
          "bn": "কী কিনছেন"
        },
        "body": {
          "en": "Pick an item, a quantity and a unit price, and add as many lines as you need. The order total adds itself up as you type - and when the delivery is received, every one of these lines goes onto the shelf.",
          "bn": "পণ্য, পরিমাণ আর একক দাম দিন, প্রয়োজনমতো লাইন যোগ করুন। টাইপ করার সঙ্গে সঙ্গেই মোট হিসাব বসে যায় — আর মাল বুঝে নেওয়ার সময় প্রতিটি লাইন স্টকে উঠে যায়।"
        }
      },
      "purchase.done": {
        "title": {
          "en": "That is your buying under control",
          "bn": "কেনাকাটা এখন আপনার নিয়ন্ত্রণে"
        },
        "body": {
          "en": "Ordered, received, stocked and costed, without anybody writing it twice. Next: the costs that do not arrive on a lorry.",
          "bn": "অর্ডার, বুঝে নেওয়া, স্টকে তোলা আর খরচ বসানো — কাউকে দুবার লিখতে হয়নি। এরপর: যে খরচগুলো ট্রাকে করে আসে না।"
        }
      },
      "books.intro": {
        "title": {
          "en": "Rent, gas, wages - and the odd job",
          "bn": "ভাড়া, গ্যাস, বেতন — আর টুকিটাকি আয়"
        },
        "body": {
          "en": "Not every taka moves through the till. Log the rest here and the profit figure you read in mission two becomes the truth rather than an estimate.",
          "bn": "সব টাকা কাউন্টার দিয়ে যায় না। বাকিটা এখানে লিখলে দ্বিতীয় মিশনে দেখা লাভের হিসাব আন্দাজ না থেকে সত্যি হয়ে ওঠে।"
        }
      },
      "books.open-accounting": {
        "title": {
          "en": "Open Accounting",
          "bn": "অ্যাকাউন্টিং খুলুন"
        },
        "body": {
          "en": "Ledgers, income, expenses, tax rules and headers.",
          "bn": "লেজার, আয়, ব্যয়, করের নিয়ম আর হেডার।"
        }
      },
      "books.open-expenses": {
        "title": {
          "en": "Go to Expenses",
          "bn": "ব্যয়ে যান"
        },
        "body": {
          "en": "The expenses card on this page.",
          "bn": "এই পাতার ব্যয়ের কার্ডটি।"
        }
      },
      "books.log-expense": {
        "title": {
          "en": "Log an expense",
          "bn": "একটি খরচ লিখুন"
        },
        "body": {
          "en": "Log Expense, at the top right. Try it with anything - a gas bill, a repair.",
          "bn": "উপরে ডানদিকে \"Log Expense\"। যেকোনো কিছু দিয়ে চেষ্টা করুন — গ্যাস বিল, মেরামত।"
        }
      },
      "books.expense-form": {
        "title": {
          "en": "A header, a category, an amount",
          "bn": "হেডার, ধরন, পরিমাণ"
        },
        "body": {
          "en": "The header is what your accountant will group it under; the category is what you call it. Save it and it lands in the profit report immediately.",
          "bn": "হেডার দিয়ে হিসাবরক্ষক শ্রেণিভুক্ত করেন; ধরন আপনার নিজের নাম। সংরক্ষণ করলেই সঙ্গে সঙ্গে লাভের রিপোর্টে চলে যায়।"
        }
      },
      "books.income": {
        "title": {
          "en": "Income works identically",
          "bn": "আয়ও ঠিক একইভাবে চলে"
        },
        "body": {
          "en": "This is the Income screen, and it is the same form. Anything you earn away from the till - a catering job, a hall booking - belongs here so it counts toward the month.",
          "bn": "এটি আয়ের স্ক্রিন, ফর্মও একই। কাউন্টারের বাইরের যেকোনো আয় — ক্যাটারিং, হল ভাড়া — এখানেই লিখুন, তাহলেই মাসের হিসাবে ধরা পড়বে।"
        }
      },
      "books.done": {
        "title": {
          "en": "Your books now agree with your restaurant",
          "bn": "আপনার হিসাব এখন রেস্টুরেন্টের সঙ্গে মেলে"
        },
        "body": {
          "en": "Sales from the till, purchases from suppliers, and everything else by hand. One last thing, and it is the one worth remembering.",
          "bn": "কাউন্টারের বিক্রি, সরবরাহকারীর কেনাকাটা, আর বাকিটা হাতে লেখা। শেষ একটি বিষয় বাকি — আর সেটাই মনে রাখার মতো।"
        }
      },
      "again.intro": {
        "title": {
          "en": "You can always start this again",
          "bn": "যেকোনো সময় আবার শুরু করতে পারবেন"
        },
        "body": {
          "en": "Close it whenever you like and go and press things yourself - the tour keeps your place. Here is where it lives so you can find it again.",
          "bn": "যখন খুশি বন্ধ করে নিজে ঘুরে দেখুন — গাইড আপনার জায়গা মনে রাখবে। কোথায় পাবেন, সেটাই দেখাচ্ছি।"
        }
      },
      "again.open-profile": {
        "title": {
          "en": "Open My Profile",
          "bn": "মাই প্রোফাইল খুলুন"
        },
        "body": {
          "en": "Right at the bottom of the main menu.",
          "bn": "মূল মেনুর একদম নিচে।"
        }
      },
      "again.card": {
        "title": {
          "en": "This card, on your profile",
          "bn": "আপনার প্রোফাইলের এই কার্ডটি"
        },
        "body": {
          "en": "It remembers where you got to - against you, not against this browser. Close the tour on your phone and pick it up on a laptop at the same step.",
          "bn": "আপনি কতদূর গেছেন তা এটি মনে রাখে — ব্রাউজারের নামে নয়, আপনার নামে। ফোনে বন্ধ করে ল্যাপটপে ঠিক একই ধাপ থেকে চালিয়ে যেতে পারবেন।"
        }
      },
      "again.buttons": {
        "title": {
          "en": "Continue, or start over",
          "bn": "চালিয়ে যান, নয়তো নতুন করে শুরু"
        },
        "body": {
          "en": "Continue picks up at the step you left. Start over goes back to the first mission - useful when you want to show somebody else.",
          "bn": "\"Continue\" যেখানে ছেড়েছিলেন সেখান থেকে শুরু করে। \"Start over\" প্রথম মিশনে ফেরায় — অন্য কাউকে দেখাতে চাইলে কাজে লাগে।"
        }
      },
      "again.done": {
        "title": {
          "en": "That is the whole product",
          "bn": "পুরো পণ্যটাই দেখা হয়ে গেল"
        },
        "body": {
          "en": "Reports, till, orders, buying and books - and you worked every one of them yourself. The tour is on your profile whenever you want it back, and there is one last thing worth saying before you go.",
          "bn": "রিপোর্ট, কাউন্টার, অর্ডার, কেনাকাটা আর হিসাব — প্রতিটি আপনি নিজে করেছেন। গাইডটি আপনার প্রোফাইলেই থাকল, যখন খুশি ফিরে আসুন। যাওয়ার আগে শেষ একটি কথা বলার আছে।"
        }
      },
      "yours.trial": {
        "title": {
          "en": "Now do it with your own menu",
          "bn": "এবার নিজের মেনু দিয়ে করুন"
        },
        "body": {
          "en": "Everything you just used belongs to a made-up restaurant. Start your own free trial and it is the same screens with your food, your stock and your prices - add a few dishes and take one real sale, and the reports from the first mission start filling with your numbers. It is free for seven days, there is no card to enter, and it opens the moment you say yes.",
          "bn": "এতক্ষণ যা ব্যবহার করলেন, তা একটি কাল্পনিক রেস্টুরেন্টের। নিজের ফ্রি ট্রায়াল শুরু করলে এই একই স্ক্রিনগুলোই পাবেন — আপনার খাবার, আপনার স্টক, আপনার দাম। কয়েকটি আইটেম যোগ করে একটি বিক্রি করুন, প্রথম মিশনের রিপোর্টগুলো আপনার নিজের হিসাবে ভরে উঠবে। সাত দিন সম্পূর্ণ ফ্রি, কোনো কার্ড লাগবে না, আর হ্যাঁ বললেই এখনই চালু।"
        }
      }
    }
  },
  "trial": {
    "missions": {
      "dish": {
        "en": "Your first dish",
        "bn": "আপনার প্রথম খাবার"
      },
      "shelf": {
        "en": "Stock you sell as it comes",
        "bn": "যেভাবে আসে সেভাবেই বিক্রি"
      },
      "ingredients": {
        "en": "Two things you cook with",
        "bn": "রান্নায় লাগে এমন দুটি জিনিস"
      },
      "recipe": {
        "en": "The recipe that joins them",
        "bn": "যে রেসিপি এদের জোড়া লাগায়"
      },
      "bulk": {
        "en": "Oil, sauce and the rest",
        "bn": "তেল, সস আর বাকিগুলো"
      },
      "buy": {
        "en": "Buy all four in one order",
        "bn": "এক আদেশেই চারটি কেনা"
      },
      "health": {
        "en": "What is on the shelf now",
        "bn": "এখন তাকে কী আছে"
      },
      "sell": {
        "en": "Sell, and watch stock fall",
        "bn": "বিক্রি করুন, স্টক কমতে দেখুন"
      },
      "used": {
        "en": "The oil nobody sold",
        "bn": "যে তেল কেউ বিক্রি করেনি"
      },
      "again": {
        "en": "Coming back to this tour",
        "bn": "এই গাইডে ফিরে আসা"
      },
      "keep": {
        "en": "Keeping what you built",
        "bn": "যা গড়লেন তা রেখে দেওয়া"
      }
    },
    "steps": {
      "dish.intro": {
        "title": {
          "en": "Put something you cook on the menu",
          "bn": "আপনি রান্না করেন এমন কিছু মেনুতে তুলুন"
        },
        "body": {
          "en": "Your restaurant is empty right now, and nothing else in here works until something is on the menu. Pick one dish you sell every day - the rest of this walkthrough is built around it.",
          "bn": "এই মুহূর্তে আপনার রেস্টুরেন্ট খালি, আর মেনুতে কিছু না থাকলে এখানকার কিছুই চলবে না। প্রতিদিন বিক্রি হয় এমন একটি খাবার বেছে নিন — বাকি পুরো গাইডটি এটিকে ঘিরেই এগোবে।"
        }
      },
      "dish.open-catalog": {
        "title": {
          "en": "Open Catalog",
          "bn": "ক্যাটালগ খুলুন"
        },
        "body": {
          "en": "In the main menu. Everything you put on a menu lives behind this one item.",
          "bn": "মূল মেনুতে। মেনুতে যা কিছু রাখবেন, সবই এর পেছনে।"
        }
      },
      "dish.open-products": {
        "title": {
          "en": "Go to Products",
          "bn": "প্রোডাক্টে যান"
        },
        "body": {
          "en": "The products card on this page.",
          "bn": "এই পাতার প্রোডাক্ট কার্ডটি।"
        }
      },
      "dish.add": {
        "title": {
          "en": "Add your first product",
          "bn": "প্রথম প্রোডাক্টটি যোগ করুন"
        },
        "body": {
          "en": "New Product, at the top right.",
          "bn": "উপরে ডানদিকে \"+ New Product\"।"
        }
      },
      "dish.form": {
        "title": {
          "en": "A name, a price, a category",
          "bn": "নাম, দাম আর ধরন"
        },
        "body": {
          "en": "That is all a cooked dish needs to exist. What it is made of is a separate question and we answer it shortly, with a recipe - so put in the dish itself and save it. Real food, real price: everything you do from here counts.",
          "bn": "একটি রান্না করা খাবারের জন্য এতটুকুই যথেষ্ট। কী দিয়ে তৈরি সেটি আলাদা প্রশ্ন, একটু পরেই রেসিপি দিয়ে তার উত্তর দেব — তাই আপাতত খাবারটি লিখে সংরক্ষণ করুন। সত্যিকারের খাবার, সত্যিকারের দাম দিন: এখান থেকে যা করবেন সবই গোনায় ধরা হবে।"
        }
      },
      "dish.done": {
        "title": {
          "en": "You have a menu",
          "bn": "আপনার একটি মেনু হয়ে গেল"
        },
        "body": {
          "en": "One dish, and the till can already sell it. Next: the stock you sell exactly as it arrives.",
          "bn": "একটি খাবার, আর কাউন্টার এখনই সেটি বিক্রি করতে পারে। এরপর: যে মাল যেভাবে আসে সেভাবেই বিক্রি হয়।"
        }
      },
      "shelf.intro": {
        "title": {
          "en": "A bottle of water is not cooked",
          "bn": "পানির বোতল তো রান্না করতে হয় না"
        },
        "body": {
          "en": "Some of what you sell is bought and sold unchanged - a soft drink, a packet of crisps, a bottle of water. That is stock rather than a dish, and one tick puts it on the till beside your food.",
          "bn": "আপনার বিক্রির কিছু জিনিস যেমন কেনেন তেমনই বিক্রি হয় — কোমল পানীয়, চিপসের প্যাকেট, পানির বোতল। এগুলো খাবার নয়, স্টক — আর একটি টিক দিলেই সেটি আপনার খাবারের পাশে কাউন্টারে চলে আসে।"
        }
      },
      "shelf.open-inventory": {
        "title": {
          "en": "Open Inventory",
          "bn": "ইনভেন্টরি খুলুন"
        },
        "body": {
          "en": "Items, suppliers, recipes, purchase orders and consumption all sit behind this one.",
          "bn": "পণ্য, সরবরাহকারী, রেসিপি, ক্রয় আদেশ আর ব্যবহারের হিসাব — সবই এর পেছনে।"
        }
      },
      "shelf.open-items": {
        "title": {
          "en": "Go to Inventory Items",
          "bn": "ইনভেন্টরি আইটেমে যান"
        },
        "body": {
          "en": "Every physical thing you buy is counted here, whether you cook with it or sell it.",
          "bn": "আপনি যা কিছু কেনেন তার সবই এখানে গোনা হয় — রান্নায় লাগুক বা সরাসরি বিক্রি হোক।"
        }
      },
      "shelf.add": {
        "title": {
          "en": "Add a new item",
          "bn": "নতুন একটি আইটেম যোগ করুন"
        },
        "body": {
          "en": "New Item, at the top right. Something you sell exactly as you buy it.",
          "bn": "উপরে ডানদিকে \"+ New Item\"। যেভাবে কেনেন ঠিক সেভাবেই বিক্রি হয় এমন কিছু।"
        }
      },
      "shelf.sellable": {
        "title": {
          "en": "Tick Directly Sellable",
          "bn": "\"Directly Sellable\" টিক দিন"
        },
        "body": {
          "en": "That tick is the whole difference. It gives the item a selling price and puts it on the till beside your dishes, and selling one takes it straight off this outlet’s shelf - no recipe, because nothing is made. Fill the rest in and save.",
          "bn": "পুরো পার্থক্যটা ওই টিকেই। এটি আইটেমটির একটি বিক্রয়মূল্য দেয়, খাবারের পাশে কাউন্টারে তুলে দেয়, আর একটি বিক্রি হলেই সেটি এই আউটলেটের তাক থেকে কমে যায় — রেসিপির দরকার নেই, কারণ কিছু বানানোই হচ্ছে না। বাকিটা পূরণ করে সংরক্ষণ করুন।"
        }
      },
      "shelf.done": {
        "title": {
          "en": "That one is on the counter now",
          "bn": "ওটি এখন কাউন্টারে চলে এসেছে"
        },
        "body": {
          "en": "Bought and sold as one thing, counted as one thing. Next: the stock nobody ever buys on its own.",
          "bn": "একটি জিনিস হিসেবেই কেনা, একটি জিনিস হিসেবেই বিক্রি আর গোনা। এরপর: যে মাল কেউ আলাদা করে কেনে না।"
        }
      },
      "ingredients.intro": {
        "title": {
          "en": "Now the things nobody orders",
          "bn": "এবার যেগুলো কেউ অর্ডার করে না"
        },
        "body": {
          "en": "Chicken, flour, cheese - stock that only ever leaves the building inside a dish. Add two of them now and leave them unsellable; the next mission joins them to the dish you made first.",
          "bn": "মুরগি, আটা, পনির — এসব মাল কেবল খাবারের ভেতরেই বাইরে যায়। এখন এরকম দুটি যোগ করুন, বিক্রয়যোগ্য না রেখেই; পরের মিশনে এগুলোকে আপনার প্রথম খাবারটির সঙ্গে জুড়ে দেব।"
        }
      },
      "ingredients.add-first": {
        "title": {
          "en": "Add the first ingredient",
          "bn": "প্রথম উপকরণটি যোগ করুন"
        },
        "body": {
          "en": "Same button, same form. Buy it in the unit it actually arrives in - a sack, a carton, a kilo.",
          "bn": "একই বোতাম, একই ফর্ম। যে এককে মালটি সত্যিই আসে সেই এককেই লিখুন — বস্তা, কার্টন, কেজি।"
        }
      },
      "ingredients.not-sellable": {
        "title": {
          "en": "Leave this one unticked",
          "bn": "এটিতে টিক দেবেন না"
        },
        "body": {
          "en": "Unticked means it never appears on the till - nobody walks in and buys a kilo of your flour. It moves only when a dish that needs it is sold, and the recipe is what tells the system how much.",
          "bn": "টিক না দিলে এটি কাউন্টারে কখনো দেখা যাবে না — কেউ এসে আপনার এক কেজি আটা কিনবে না। এটি তখনই কমবে যখন এটি লাগে এমন খাবার বিক্রি হবে, আর কতটুকু কমবে তা রেসিপিই বলে দেয়।"
        }
      },
      "ingredients.add-second": {
        "title": {
          "en": "Now a second one",
          "bn": "এবার দ্বিতীয়টি"
        },
        "body": {
          "en": "One more ingredient the same way. Two is enough to make the recipe worth reading.",
          "bn": "একইভাবে আরও একটি উপকরণ। রেসিপিটি বোঝার জন্য দুটিই যথেষ্ট।"
        }
      },
      "ingredients.done": {
        "title": {
          "en": "Two ingredients on the books",
          "bn": "দুটি উপকরণ হিসাবে উঠল"
        },
        "body": {
          "en": "Counted, but not connected to anything yet. That is the next mission, and it is the one that makes stock look after itself.",
          "bn": "গোনা হলো, কিন্তু এখনো কিছুর সঙ্গে যুক্ত নয়। সেটিই পরের মিশন — আর ওটিই স্টককে নিজে থেকে চলতে শেখায়।"
        }
      },
      "recipe.intro": {
        "title": {
          "en": "Tell it what the dish is made of",
          "bn": "খাবারটি কী দিয়ে তৈরি সেটি বলে দিন"
        },
        "body": {
          "en": "A recipe is the link between the dish from mission one and the two ingredients you have just added. Once it exists, selling the dish takes its ingredients off the shelf without anybody writing anything down - which is the whole reason to keep stock in here at all.",
          "bn": "রেসিপি হলো প্রথম মিশনের খাবারটির সঙ্গে এইমাত্র যোগ করা দুটি উপকরণের সংযোগ। এটি একবার তৈরি হলে খাবারটি বিক্রি হলেই উপকরণগুলো নিজে থেকেই তাক থেকে কমে যাবে — কাউকে কিছু লিখতে হবে না। স্টক এখানে রাখার আসল কারণই এটি।"
        }
      },
      "recipe.open-inventory": {
        "title": {
          "en": "Back to Inventory",
          "bn": "ইনভেন্টরিতে ফিরুন"
        },
        "body": {
          "en": "In the main menu.",
          "bn": "মূল মেনুতে।"
        }
      },
      "recipe.open-recipes": {
        "title": {
          "en": "Go to Recipes",
          "bn": "রেসিপিতে যান"
        },
        "body": {
          "en": "The recipes card on this page.",
          "bn": "এই পাতার রেসিপি কার্ডটি।"
        }
      },
      "recipe.pick-product": {
        "title": {
          "en": "Choose the dish you made",
          "bn": "আপনার বানানো খাবারটি বেছে নিন"
        },
        "body": {
          "en": "Pick it from the list. A recipe belongs to a dish, so everything below now applies to that one and nothing else.",
          "bn": "তালিকা থেকে বেছে নিন। রেসিপি একটি খাবারের নিজস্ব, তাই নিচের সবকিছু কেবল ওই খাবারটির জন্যই প্রযোজ্য।"
        }
      },
      "recipe.rows": {
        "title": {
          "en": "One line per ingredient",
          "bn": "প্রতি উপকরণে একটি করে লাইন"
        },
        "body": {
          "en": "Add a row for each of your two and say how much one portion uses. The unit shown is the one you bought it in, so a quarter of a kilo is 0.25 - nothing to convert in your head.",
          "bn": "আপনার দুটি উপকরণের প্রতিটির জন্য একটি করে সারি যোগ করুন, আর এক প্লেটে কতটুকু লাগে তা লিখুন। যে এককে কিনেছেন সেই এককই দেখানো হয়, তাই সিকি কেজি মানে ০.২৫ — মাথায় হিসাব করার কিছু নেই।"
        }
      },
      "recipe.save": {
        "title": {
          "en": "Save the recipe",
          "bn": "রেসিপিটি সংরক্ষণ করুন"
        },
        "body": {
          "en": "Save Recipe, under the table.",
          "bn": "টেবিলের নিচে \"Save Recipe\"।"
        }
      },
      "recipe.done": {
        "title": {
          "en": "The dish knows its own ingredients",
          "bn": "খাবারটি এখন নিজের উপকরণ চেনে"
        },
        "body": {
          "en": "From now on, selling it moves exactly these quantities and nothing else. Next: the things a recipe cannot measure.",
          "bn": "এখন থেকে এটি বিক্রি হলে ঠিক এই পরিমাণগুলোই কমবে, আর কিছু নয়। এরপর: যেগুলো রেসিপি দিয়ে মাপা যায় না।"
        }
      },
      "bulk.intro": {
        "title": {
          "en": "Some things you cannot measure per plate",
          "bn": "কিছু জিনিস প্লেট ধরে মাপা যায় না"
        },
        "body": {
          "en": "Nobody weighs the frying oil for one portion of chicken. Oil, sauce, gas, cleaning supplies - not sold on their own, not worth putting in a recipe, and still money. They get counted a third way, and this mission adds one.",
          "bn": "এক প্লেট মুরগির জন্য কেউ ভাজার তেল ওজন করে না। তেল, সস, গ্যাস, পরিষ্কারের সামগ্রী — আলাদা করে বিক্রি হয় না, রেসিপিতে তোলাও পোষায় না, অথচ টাকা তো লাগেই। এগুলো তৃতীয় একটি উপায়ে গোনা হয়, আর এই মিশনে সেরকম একটি যোগ করব।"
        }
      },
      "bulk.add": {
        "title": {
          "en": "Add one of those",
          "bn": "এরকম একটি যোগ করুন"
        },
        "body": {
          "en": "Cooking oil, a sauce, whatever your kitchen goes through without counting.",
          "bn": "রান্নার তেল, কোনো সস — আপনার রান্নাঘরে যা গোনা ছাড়াই খরচ হয়।"
        }
      },
      "bulk.form": {
        "title": {
          "en": "Bought in drums, used by the day",
          "bn": "ড্রামে কেনা, দিনে দিনে খরচ"
        },
        "body": {
          "en": "Fill it in like an ingredient and leave Directly Sellable unticked. Buy it in the unit the delivery note uses - a drum, a five-litre bottle - because that is the number you will be checking against.",
          "bn": "উপকরণের মতো করেই পূরণ করুন, \"Directly Sellable\" টিক দেবেন না। ডেলিভারি নোটে যে এককে লেখা থাকে সেই এককেই কিনুন — ড্রাম, পাঁচ লিটারের বোতল — কারণ ওই সংখ্যাটির সঙ্গেই মিলিয়ে দেখবেন।"
        }
      },
      "bulk.done": {
        "title": {
          "en": "That one moves by hand",
          "bn": "এটি হাতে হাতেই কমবে"
        },
        "body": {
          "en": "Nothing will ever deduct it for you - no till, no recipe. You tell the system when it goes, and there is a mission near the end for exactly that. First, let us buy all four.",
          "bn": "এটি কেউ নিজে থেকে কমাবে না — কাউন্টারও না, রেসিপিও না। কখন খরচ হলো সেটি আপনি জানাবেন, আর শেষ দিকে ঠিক তার জন্যই একটি মিশন আছে। তার আগে চলুন চারটিই কিনে ফেলি।"
        }
      },
      "buy.intro": {
        "title": {
          "en": "Nothing is on the shelf yet",
          "bn": "তাকে এখনো কিছুই নেই"
        },
        "body": {
          "en": "Four items exist and every one of them is at zero, because creating an item is not the same as buying it. Stock arrives through a purchase order: one form that tells the supplier what you want, puts the delivery on the shelf, and writes the cost into your accounts.",
          "bn": "চারটি আইটেম আছে, অথচ প্রতিটিই শূন্য — কারণ আইটেম তৈরি করা আর কেনা এক নয়। মাল আসে ক্রয় আদেশের মাধ্যমে: একটি ফর্মই সরবরাহকারীকে চাহিদা জানায়, মাল এলে তাকে তোলে, আর খরচটি হিসাবে বসায়।"
        }
      },
      "buy.open-inventory": {
        "title": {
          "en": "Open Inventory",
          "bn": "ইনভেন্টরি খুলুন"
        },
        "body": {
          "en": "In the main menu.",
          "bn": "মূল মেনুতে।"
        }
      },
      "buy.open-po": {
        "title": {
          "en": "Go to Purchase Orders",
          "bn": "ক্রয় আদেশে যান"
        },
        "body": {
          "en": "The purchase orders card on this page.",
          "bn": "এই পাতায় ক্রয় আদেশের কার্ডটি।"
        }
      },
      "buy.create": {
        "title": {
          "en": "Start a new order",
          "bn": "নতুন একটি আদেশ শুরু করুন"
        },
        "body": {
          "en": "Create PO, at the top right.",
          "bn": "উপরে ডানদিকে \"Create PO\"।"
        }
      },
      "buy.supplier": {
        "title": {
          "en": "Who you are buying from",
          "bn": "কার কাছ থেকে কিনছেন"
        },
        "body": {
          "en": "Pick a supplier - and if the list is empty, add one under Inventory first, then come back. Every order you place against a supplier builds a history you can hold them to.",
          "bn": "একজন সরবরাহকারী বেছে নিন — তালিকা খালি থাকলে আগে ইনভেন্টরি থেকে একজন যোগ করে ফিরে আসুন। প্রতিটি আদেশ একটি ইতিহাস গড়ে, যা দিয়ে তাঁদের জবাবদিহি করাতে পারবেন।"
        }
      },
      "buy.lines": {
        "title": {
          "en": "All four items, one line each",
          "bn": "চারটি আইটেম, প্রতিটির এক লাইন"
        },
        "body": {
          "en": "Add a line for each one you created - the sellable one, both ingredients and the oil - with the quantity and what you actually paid. The total adds itself up as you type, and that unit price becomes the item’s cost.",
          "bn": "আপনার তৈরি প্রতিটি আইটেমের জন্য একটি করে লাইন যোগ করুন — বিক্রয়যোগ্যটি, দুটি উপকরণ আর তেল — সঙ্গে পরিমাণ আর সত্যিকারের দাম। টাইপ করার সঙ্গে সঙ্গেই মোট বসে যায়, আর ওই একক দামটিই আইটেমের খরচ হয়ে যায়।"
        }
      },
      "buy.status": {
        "title": {
          "en": "Received means it is on the shelf",
          "bn": "\"Received\" মানে মাল তাকে উঠেছে"
        },
        "body": {
          "en": "Leave it on Received and saving puts every one of these quantities into the outlet’s stock. Pending or Approved records the order without moving anything - for stock still on its way.",
          "bn": "\"Received\" রেখে দিলে সংরক্ষণ করামাত্র প্রতিটি পরিমাণ আউটলেটের স্টকে যোগ হয়ে যাবে। \"Pending\" বা \"Approved\" কেবল আদেশটি লিখে রাখে, কিছু নড়ে না — যে মাল এখনো পথে আছে তার জন্য।"
        }
      },
      "buy.save": {
        "title": {
          "en": "Save the order",
          "bn": "আদেশটি সংরক্ষণ করুন"
        },
        "body": {
          "en": "Create PO, at the bottom of the form.",
          "bn": "ফর্মের নিচে \"Create PO\"।"
        }
      },
      "buy.done": {
        "title": {
          "en": "Four items, all in stock",
          "bn": "চারটি আইটেমই এখন স্টকে"
        },
        "body": {
          "en": "Ordered, delivered, counted and costed from one form, without writing it down twice. Now let us see what that did to the storeroom.",
          "bn": "একটি ফর্ম থেকেই অর্ডার, ডেলিভারি, গোনা আর খরচ — দুবার লিখতে হয়নি। এবার দেখি গুদামে এর ফল কী হলো।"
        }
      },
      "health.intro": {
        "title": {
          "en": "The screen that stops you running out",
          "bn": "যে স্ক্রিন মাল ফুরানো ঠেকায়"
        },
        "body": {
          "en": "Running out mid-service costs you the table and the reputation. This one screen answers what you have, what it is worth, and what to reorder - and you have just given it something real to say.",
          "bn": "সার্ভিসের মাঝপথে মাল ফুরালে টেবিলও যায়, সুনামও যায়। এই এক স্ক্রিনেই জানবেন কী আছে, তার দাম কত, আর কী আবার কিনতে হবে — আর এইমাত্র আপনি সেটিকে সত্যিকারের কিছু বলার মতো তথ্য দিয়েছেন।"
        }
      },
      "health.open-reporting": {
        "title": {
          "en": "Open Reporting",
          "bn": "রিপোর্টিং খুলুন"
        },
        "body": {
          "en": "In the main menu.",
          "bn": "মূল মেনুতে।"
        }
      },
      "health.open-tab": {
        "title": {
          "en": "Click Inventory Health",
          "bn": "ইনভেন্টরি হেলথ-এ ক্লিক করুন"
        },
        "body": {
          "en": "In the row of tabs. This one ignores the date filter on purpose - stock is what you have now, not what you had.",
          "bn": "ট্যাবের সারিতে। এটি ইচ্ছে করেই তারিখ ফিল্টার মানে না — স্টক মানে এখন কী আছে, আগে কী ছিল তা নয়।"
        }
      },
      "health.low": {
        "title": {
          "en": "What needs reordering",
          "bn": "কী আবার কিনতে হবে"
        },
        "body": {
          "en": "Anything at or under the minimum stock level you set on the item itself. Set that level on each of your four and this number starts doing the ordering for you.",
          "bn": "আইটেমে আপনি যে ন্যূনতম সীমা দিয়েছেন, তাতে বা তার নিচে থাকা সবকিছু। আপনার চারটিতেই ওই সীমা বসিয়ে দিন — তাহলে এই সংখ্যাটিই আপনার হয়ে কেনাকাটার কথা মনে করিয়ে দেবে।"
        }
      },
      "health.value": {
        "title": {
          "en": "Money sitting on the shelves",
          "bn": "তাকের উপর পড়ে থাকা টাকা"
        },
        "body": {
          "en": "What you paid on the purchase order, still unsold. Stock is cash you have already spent, and this is how much of it is waiting.",
          "bn": "ক্রয় আদেশে যা দিয়েছেন, যা এখনো বিক্রি হয়নি। স্টক মানে আগেই খরচ করা নগদ — তার কতটুকু অপেক্ষায় আছে, এটিই বলে।"
        }
      },
      "health.table": {
        "title": {
          "en": "Your four items, in one list",
          "bn": "আপনার চারটি আইটেম, এক তালিকায়"
        },
        "body": {
          "en": "Low stock first, always, so the trouble is at the top. Take a note of what each of your four says right now - the next two missions are about changing these very numbers.",
          "bn": "কম স্টক সবসময় আগে, যাতে সমস্যা উপরে থাকে। এই মুহূর্তে আপনার চারটির প্রতিটি কী বলছে একটু দেখে রাখুন — পরের দুটি মিশন ঠিক এই সংখ্যাগুলোই বদলাবে।"
        }
      },
      "health.done": {
        "title": {
          "en": "The storeroom, without walking to it",
          "bn": "গুদামে না গিয়েই গুদামের খবর"
        },
        "body": {
          "en": "That is stock coming in. Next: stock going out, at the till.",
          "bn": "মাল আসার হিসাব হলো। এরপর: মাল বেরিয়ে যাওয়া — কাউন্টার থেকে।"
        }
      },
      "sell.intro": {
        "title": {
          "en": "Take one sale with your own menu",
          "bn": "নিজের মেনু দিয়েই একটি বিক্রি করুন"
        },
        "body": {
          "en": "Sell your dish and your sellable item in the same order, then come back to that list. Both come off the shelf - and they come off in completely different ways, which is the point of this mission.",
          "bn": "একই অর্ডারে আপনার খাবারটি আর বিক্রয়যোগ্য আইটেমটি বিক্রি করুন, তারপর ওই তালিকায় ফিরে আসুন। দুটোই তাক থেকে কমবে — কিন্তু সম্পূর্ণ আলাদা নিয়মে, আর সেটাই এই মিশনের আসল কথা।"
        }
      },
      "sell.open-pos": {
        "title": {
          "en": "Open the POS",
          "bn": "পিওএস খুলুন"
        },
        "body": {
          "en": "This is the screen your counter staff will live on all day.",
          "bn": "সারাদিন আপনার কাউন্টারের কর্মীরা এই স্ক্রিনেই থাকবেন।"
        }
      },
      "sell.pick": {
        "title": {
          "en": "Tap your dish, then your item",
          "bn": "খাবারটিতে চাপ দিন, তারপর আইটেমটিতে"
        },
        "body": {
          "en": "They sit side by side here - the one you cook and the one that came straight off the delivery - because to somebody at the counter there is no difference. One tap each.",
          "bn": "এখানে দুটোই পাশাপাশি — যেটি আপনি রান্না করেন আর যেটি ডেলিভারি থেকে সোজা এসেছে — কারণ কাউন্টারে দাঁড়ানো মানুষের কাছে দুটোর মধ্যে ফারাক নেই। প্রতিটিতে একবার করে চাপ দিন।"
        }
      },
      "sell.cart": {
        "title": {
          "en": "The bill builds itself",
          "bn": "বিল নিজেই তৈরি হচ্ছে"
        },
        "body": {
          "en": "Quantities, a note for the kitchen, a discount on one line or on the lot - with the tax and the total recalculated as you go.",
          "bn": "পরিমাণ, রান্নাঘরের জন্য নোট, এক লাইনে বা পুরো বিলে ছাড় — সঙ্গে সঙ্গেই কর আর মোট হিসাব বসে যায়।"
        }
      },
      "sell.place": {
        "title": {
          "en": "Place the order",
          "bn": "অর্ডারটি দিন"
        },
        "body": {
          "en": "It goes to the kitchen screen and the orders board in the same instant. This is a real order in your restaurant.",
          "bn": "একই মুহূর্তে এটি রান্নাঘরের স্ক্রিন আর অর্ডার বোর্ডে চলে যায়। এটি আপনার রেস্টুরেন্টের সত্যিকারের একটি অর্ডার।"
        }
      },
      "sell.deducted": {
        "title": {
          "en": "Both fell, for different reasons",
          "bn": "দুটোই কমল, কিন্তু আলাদা কারণে"
        },
        "body": {
          "en": "The sellable item came off one for one, because you sold the thing itself. The dish never moved - what moved is the two ingredients, by the exact amounts in your recipe. The oil has not moved at all, and that is correct.",
          "bn": "বিক্রয়যোগ্য আইটেমটি এক-এর বদলে এক কমেছে, কারণ আপনি জিনিসটিই বিক্রি করেছেন। খাবারটি নিজে কমেনি — কমেছে দুটি উপকরণ, ঠিক আপনার রেসিপিতে লেখা পরিমাণে। আর তেল একটুও কমেনি, আর সেটাই ঠিক।"
        }
      },
      "sell.done": {
        "title": {
          "en": "Selling now keeps its own count",
          "bn": "বিক্রি এখন নিজের হিসাব নিজেই রাখে"
        },
        "body": {
          "en": "Two of the three ways stock moves, both automatic. The third one is the oil, and it is the only one that needs you.",
          "bn": "স্টক নড়ার তিনটি উপায়ের দুটি হয়ে গেল, দুটিই নিজে থেকে। তৃতীয়টি হলো তেল — একমাত্র ওটির জন্যই আপনাকে লাগবে।"
        }
      },
      "used.intro": {
        "title": {
          "en": "Stock leaves without a sale",
          "bn": "বিক্রি ছাড়াই মাল কমে"
        },
        "body": {
          "en": "Oil gets used, staff eat, things spill and things get thrown away. None of it goes through the till, so none of it comes off by itself - you report it, and the shelf drops the moment you do.",
          "bn": "তেল খরচ হয়, কর্মীরা খায়, কিছু পড়ে যায়, কিছু ফেলে দিতে হয়। এর কোনোটিই কাউন্টার দিয়ে যায় না, তাই নিজে থেকে কমেও না — আপনি জানাবেন, আর জানানোমাত্রই তাক কমে যাবে।"
        }
      },
      "used.open-inventory": {
        "title": {
          "en": "Open Inventory",
          "bn": "ইনভেন্টরি খুলুন"
        },
        "body": {
          "en": "In the main menu.",
          "bn": "মূল মেনুতে।"
        }
      },
      "used.open-consumption": {
        "title": {
          "en": "Go to Report Consumption",
          "bn": "\"Report Consumption\"-এ যান"
        },
        "body": {
          "en": "The last card on this page.",
          "bn": "এই পাতার শেষ কার্ডটি।"
        }
      },
      "used.add": {
        "title": {
          "en": "Log some consumption",
          "bn": "একটি খরচ লিখুন"
        },
        "body": {
          "en": "Log Consumption, at the top right.",
          "bn": "উপরে ডানদিকে \"+ Log Consumption\"।"
        }
      },
      "used.form": {
        "title": {
          "en": "Outlet, date, item, quantity",
          "bn": "আউটলেট, তারিখ, আইটেম, পরিমাণ"
        },
        "body": {
          "en": "Pick the oil you added, say how much went and why. Saving deducts it from that outlet straight away - and deleting the log later puts it back, so a mistake costs you nothing.",
          "bn": "আপনার যোগ করা তেলটি বেছে নিন, কতটুকু গেল আর কেন — লিখে দিন। সংরক্ষণ করলেই ওই আউটলেট থেকে সঙ্গে সঙ্গে কমে যাবে — আর পরে লগটি মুছে দিলে ফিরেও আসবে, তাই ভুল হলে ক্ষতি নেই।"
        }
      },
      "used.history": {
        "title": {
          "en": "Every entry, with a name on it",
          "bn": "প্রতিটি এন্ট্রিতে একটি নাম"
        },
        "body": {
          "en": "Who reported what, when, and whether it was corrected afterwards. This is the difference between stock that was used and stock that is simply missing.",
          "bn": "কে কী জানিয়েছেন, কখন, আর পরে সংশোধন হয়েছে কি না। ব্যবহৃত মাল আর নিখোঁজ মালের পার্থক্যটা এখানেই ধরা পড়ে।"
        }
      },
      "used.stock": {
        "title": {
          "en": "And the shelf agrees",
          "bn": "আর তাকও তাই বলছে"
        },
        "body": {
          "en": "The oil has dropped by exactly what you reported. That is the last of the four moving, and every one of them now has a reason for every unit it loses.",
          "bn": "আপনি ঠিক যতটুকু জানিয়েছেন, তেল ততটুকুই কমেছে। চারটির শেষটিও নড়ল — এখন প্রতিটির প্রতিটি একক কমার পেছনে একটি কারণ আছে।"
        }
      },
      "used.done": {
        "title": {
          "en": "Your restaurant is set up",
          "bn": "আপনার রেস্টুরেন্ট সাজানো হয়ে গেল"
        },
        "body": {
          "en": "A dish, a recipe, stock you sell as it comes, stock you use by hand, a delivery in and a sale out. One last thing worth knowing before you carry on alone.",
          "bn": "একটি খাবার, একটি রেসিপি, যেভাবে আসে সেভাবে বিক্রির মাল, হাতে খরচের মাল, একটি ডেলিভারি আর একটি বিক্রি। নিজে চালানোর আগে শেষ একটি বিষয় জানা দরকার।"
        }
      },
      "again.intro": {
        "title": {
          "en": "You can always start this again",
          "bn": "যেকোনো সময় আবার শুরু করতে পারবেন"
        },
        "body": {
          "en": "Close it whenever you like and go and set the rest up yourself - it keeps your place. Here is where it lives, so you can find it again, or hand it to whoever does your stock.",
          "bn": "যখন খুশি বন্ধ করে বাকিটা নিজে সাজিয়ে নিন — এটি আপনার জায়গা মনে রাখবে। কোথায় পাবেন সেটাই দেখাচ্ছি, যাতে পরে নিজে ফিরে আসতে পারেন বা যিনি স্টক দেখেন তাঁকে দিতে পারেন।"
        }
      },
      "again.open-profile": {
        "title": {
          "en": "Open My Profile",
          "bn": "মাই প্রোফাইল খুলুন"
        },
        "body": {
          "en": "Right at the bottom of the main menu.",
          "bn": "মূল মেনুর একদম নিচে।"
        }
      },
      "again.card": {
        "title": {
          "en": "This card, on your profile",
          "bn": "আপনার প্রোফাইলের এই কার্ডটি"
        },
        "body": {
          "en": "It remembers where you got to - against you, not against this browser. Close it on your phone and pick it up on a laptop at the same step.",
          "bn": "আপনি কতদূর গেছেন তা এটি মনে রাখে — ব্রাউজারের নামে নয়, আপনার নামে। ফোনে বন্ধ করে ল্যাপটপে ঠিক একই ধাপ থেকে চালিয়ে যেতে পারবেন।"
        }
      },
      "again.buttons": {
        "title": {
          "en": "Continue, or start over",
          "bn": "চালিয়ে যান, নয়তো নতুন করে শুরু"
        },
        "body": {
          "en": "Continue picks up at the step you left. Start over goes back to the first mission - useful when you are showing a new manager how the stock works.",
          "bn": "\"Continue\" যেখানে ছেড়েছিলেন সেখান থেকে শুরু করে। \"Start over\" প্রথম মিশনে ফেরায় — নতুন ম্যানেজারকে স্টকের কাজ শেখানোর সময় কাজে লাগে।"
        }
      },
      "again.done": {
        "title": {
          "en": "You know how the whole thing works now",
          "bn": "পুরো ব্যাপারটা এখন আপনার জানা"
        },
        "body": {
          "en": "Menu, stock, recipes, buying, selling and what leaves without being sold - and you did every one of them yourself, with your own food. The walkthrough is on your profile whenever you want it back, and there is one last thing worth saying before you go.",
          "bn": "মেনু, স্টক, রেসিপি, কেনা, বেচা আর বিক্রি ছাড়াই যা কমে যায় — প্রতিটি আপনি নিজের খাবার দিয়ে নিজেই করেছেন। গাইডটি আপনার প্রোফাইলেই থাকল, যখন খুশি ফিরে আসুন। যাওয়ার আগে শেষ একটি কথা বলার আছে।"
        }
      },
      "keep.now": {
        "title": {
          "en": "It is all yours to keep",
          "bn": "পুরোটাই আপনার, রেখে দিন"
        },
        "body": {
          "en": "Your dish, your recipe, your stock and your first sale are already in here - subscribing changes nothing on these screens except the date they stop working. The introductory price is on right now, and there is no set-up cost on top of it: nothing to pay to be installed, configured or trained. If you would rather ask a person first, we are on WhatsApp and we answer.",
          "bn": "আপনার খাবার, রেসিপি, স্টক আর প্রথম বিক্রি — সব এখানেই আছে। সাবস্ক্রাইব করলে এই স্ক্রিনগুলোর কিছুই বদলাবে না, কেবল বন্ধ হওয়ার তারিখটাই বদলাবে। এখন পরিচিতিমূলক ছাড়ের দাম চলছে, আর তার উপরে কোনো সেটআপ খরচ নেই — ইনস্টল, কনফিগার বা প্রশিক্ষণের জন্য কিছুই দিতে হবে না। আগে একজন মানুষের সঙ্গে কথা বলতে চাইলে আমরা হোয়াটসঅ্যাপে আছি, উত্তরও দিই।"
        }
      }
    }
  }
};
