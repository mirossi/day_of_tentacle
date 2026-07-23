// Story, rooms, hotspots and puzzles for "Night of the Snapdragon"

const ITEMS = {
  broom: { name: 'broom', look: "A broom. For sweeping, jousting, or reaching things on high shelves." },
  hotsauce: { name: 'hot sauce', look: "Professor Von Blob's Volcanic Hot Sauce. The label just says 'XXX' and 'sorry'." },
  crank: { name: 'crank', look: "A hand crank. It cranks. By hand." },
  battery: { name: 'AA battery', look: "One AA battery. The power source of all serious science." },
  key: { name: 'garden key', look: "A slightly cuckoo-slobbered garden key." },
  ray: { name: 'shrink ray', look: "The Shrink-O-Matic 3000. Warranty void if used on plants. Perfect." }
};

async function INTRO() {
  await wait(400);
  await say('narrator', "Night of the Snapdragon. The lab of Professor Von Blob. Way past midnight.");
  await say('prof', "Ned! Thank goodness you're here! My prize snapdragon drank my Grow-O-Tonic!");
  await say('ned', "Is that bad?");
  await say('prof', "It's nine feet tall, it talks, and it's planning to mulch the entire town!");
  await say('ned', "Okay. That's bad.");
  await say('prof', "Talk to me if you need help. And hurry!");
}

async function profDialogue() {
  await say('prof', "Yes, Ned? The fate of horticulture hangs in the balance!");
  let done = false;
  while (!done) {
    const opts = [
      "What exactly happened here?",
      "How do I stop Snappy?",
      "How do I get into the garden?",
      "Nice hair. Did the plant do that?",
      "I'd better get going."
    ];
    const i = await choose(opts);
    if (i === 0) {
      await say('ned', "What exactly happened here?");
      await say('prof', "I invented a Grow-O-Tonic to end world hunger. I left it next to Snappy's water.");
      await say('prof', "Snappy drank it, grew a mouth, an ego, and strong opinions about lawnmowers.");
      await say('ned', "Classic Tuesday.");
    } else if (i === 1) {
      await say('ned', "How do I stop Snappy?");
      await say('prof', "The Shrink-O-Matic 3000! It's right there on the tripod. One zap and he's a bonsai.");
      await say('prof', "Tiny problem: it needs an AA battery. My last one is in the kitchen radio.");
      await say('ned', "A doomsday device that runs on ONE AA battery?");
      await say('prof', "Science is about efficiency, Ned.");
      setFlag('knowsBattery');
    } else if (i === 2) {
      await say('ned', "How do I get into the garden?");
      await say('prof', "Through the garden door. Which is locked. Because the cuckoo clock ate my key.");
      await say('ned', "The clock... ate your key.");
      await say('prof', "It was a misunderstanding involving fondue. The clock stopped years ago and never gave it back.");
      setFlag('knowsKey');
    } else if (i === 3) {
      await say('ned', "Nice hair. Did the plant do that?");
      await say('prof', "This is my thinking hair! Every strand points at a different idea!");
      await say('ned', "Most of them point straight up.");
      await say('prof', "Those are the BIG ideas.");
    } else {
      await say('ned', "I'd better get going.");
      await say('prof', "Godspeed, Ned! And if Snappy offers you fertilizer — DON'T take it!");
      done = true;
    }
  }
}

const ROOMS = {
  // =====================================================
  lab: {
    music: 'lab',
    floor: { minX: 60, maxX: 590, minY: 300, maxY: 385 },
    entry: {
      default: [320, 350, 1],
      fromKitchen: [140, 345, 1],
      fromGarden: [520, 345, -1]
    },
    draw(ctx, t, flags) { Art.drawLab(ctx, t, flags); },
    actors: {
      prof: {
        x: 480, y: 338, textH: 155,
        draw(ctx, t, talking) { Art.drawProfessor(ctx, 480, 338, 0.95, t, talking); }
      }
    },
    hotspots: [
      {
        name: 'kitchen door', rect: [38, 115, 84, 175], walkPos: [130, 345],
        verbs: {
          walk: async () => { playSfx('doorOpen'); goRoom('kitchen', 'fromLab'); },
          open: async () => { playSfx('doorOpen'); goRoom('kitchen', 'fromLab'); },
          look: async () => { await say('ned', "The kitchen. Where the professor commits crimes against cuisine."); }
        }
      },
      {
        name: 'garden door', rect: [532, 110, 86, 180], walkPos: [530, 350],
        verbs: {
          walk: async () => {
            if (flag('gardenUnlocked')) { playSfx('doorOpen'); await goRoom('garden', 'fromLab'); }
            else { playSfx('nope'); await say('ned', "Locked. And the padlock looks smug about it."); }
          },
          open: async () => {
            if (flag('gardenUnlocked')) { playSfx('doorOpen'); await goRoom('garden', 'fromLab'); }
            else { playSfx('nope'); await say('ned', "It's locked tight. I need a key."); }
          },
          look: async () => {
            await say('ned', flag('gardenUnlocked') ? "The garden door. Unlocked and slightly terrified." : "The garden door. Locked, with a padlock the size of my head.");
          },
          pull: async () => { playSfx('nope'); await say('ned', "Nnnngh. Nope."); }
        },
        useItem: {
          key: async () => {
            if (flag('gardenUnlocked')) { await say('ned', "Already unlocked."); return; }
            playSfx('pickup');
            setFlag('gardenUnlocked');
            removeItem('key');
            await say('ned', "Click! Take that, smug padlock.");
          }
        }
      },
      {
        name: 'Professor Von Blob', rect: [440, 215, 80, 125], walkPos: [420, 348], faceDir: 1,
        verbs: {
          talkto: profDialogue,
          look: async () => { await say('ned', "Professor Von Blob. Three PhDs, zero smoke detectors."); },
          pickup: async () => { await say('ned', "He's not a collectible."); },
          push: async () => { await say('prof', "Careful! I'm top-heavy with knowledge!"); }
        },
        give: {
          hotsauce: async () => {
            await say('prof', "GAH! Keep that away from me! That's how I lost my eyebrows in '09!");
          },
          ray: async () => {
            await say('prof', "You hold onto it, Ned. My hands shake when I'm excited. Which is always.");
          }
        }
      },
      {
        name: 'cuckoo clock', rect: [378, 60, 64, 118], walkPos: [405, 330],
        verbs: {
          look: async () => {
            if (flag('cuckooOut')) await say('ned', "The cuckoo looks deeply relieved.");
            else {
              await say('ned', "A cuckoo clock. It's stopped. Something's bulging behind the little door.");
              setFlag('knowsKey');
            }
          },
          open: async () => {
            playSfx('nope');
            await say('ned', "The little door's jammed shut. The cuckoo must be holding it from inside.");
          },
          use: async () => { await say('ned', "It needs winding. There's a square hole for some kind of crank."); },
          push: async () => { playSfx('nope'); await say('ned', "The pendulum wobbles disapprovingly."); },
          talkto: async () => { await say('ned', "Hello? Any keys in there?"); await wait(400); await say('narrator', "The clock says nothing. Clocks are like that."); }
        },
        useItem: {
          crank: async () => {
            if (flag('cuckooOut')) { await say('ned', "It's wound enough."); return; }
            await say('ned', "Let's wind this thing up.");
            playSfx('wind');
            await wait(900);
            playSfx('cuckoo');
            await wait(500);
            setFlag('cuckooOut');
            playSfx('crash');
            await say('narrator', "The cuckoo bursts out and spits a key across the room.");
            await say('ned', "Ew. But also: yes!");
          }
        }
      },
      {
        name: 'garden key', rect: [385, 318, 40, 22], walkPos: [400, 350],
        visible: () => flag('cuckooOut') && !flag('keyTaken'),
        verbs: {
          look: async () => { await say('ned', "The garden key, lightly marinated in cuckoo."); },
          pickup: async () => {
            setFlag('keyTaken');
            addItem('key');
            await say('ned', "One slobbery garden key, acquired.");
          }
        }
      },
      {
        name: 'crank', rect: [232, 200, 42, 22], walkPos: [250, 335],
        visible: () => !flag('crankTaken'),
        verbs: {
          look: async () => { await say('ned', "A hand crank, just lying on the workbench. Suspiciously convenient."); },
          pickup: async () => {
            setFlag('crankTaken');
            addItem('crank');
            await say('ned', "Got the crank. I feel more industrious already.");
          }
        }
      },
      {
        name: 'shrink ray', rect: [298, 190, 90, 105], walkPos: [340, 340],
        visible: () => !flag('rayTaken'),
        verbs: {
          look: async () => {
            if (flag('rayPowered')) await say('ned', "The Shrink-O-Matic 3000. Green light's on. It's ready.");
            else await say('ned', "The Shrink-O-Matic 3000. The power light is off. It needs a battery.");
          },
          pickup: async () => {
            if (flag('rayPowered')) {
              setFlag('rayTaken');
              addItem('ray');
              await say('ned', "Shrink ray: acquired. I feel powerful and slightly irresponsible.");
            } else {
              playSfx('nope');
              await say('ned', "No point lugging it around with no battery in it.");
            }
          },
          use: async () => { await say('ned', "Not in here! The professor's ego is the only big thing I'd shrink."); },
          push: async () => { playSfx('boing'); await say('ned', "The tripod wobbles alarmingly. Let's not."); }
        },
        useItem: {
          battery: async () => {
            playSfx('pickup');
            removeItem('battery');
            setFlag('rayPowered');
            await say('ned', "Battery's in. The little green light blinks like it means business.");
            await say('prof', "IT LIVES! I mean — it functions as intended!");
          }
        }
      },
      {
        name: 'workbench', rect: [140, 216, 160, 74], walkPos: [220, 335],
        verbs: {
          look: async () => { await say('ned', "Beakers of bubbling mystery goo. One of them is labeled 'DO NOT'."); },
          use: async () => { await say('ned', "I'm not touching the goo. The goo touched back once."); },
          pickup: async () => { playSfx('nope'); await say('ned', "The last guy who took the professor's goo grew a second nose."); }
        }
      },
      {
        name: 'poster', rect: [196, 70, 76, 78], walkPos: [230, 330],
        verbs: {
          look: async () => { await say('ned', "'SCIENCE IS FUN. Results may vary.' They varied, alright."); },
          pull: async () => { await say('ned', "There's no secret safe behind it. I checked. Twice."); }
        }
      },
      {
        name: 'window', rect: [452, 34, 72, 72], walkPos: [470, 330],
        verbs: {
          look: async () => { await say('ned', "Full moon tonight. Perfect weather for vengeful vegetation."); },
          open: async () => { playSfx('nope'); await say('ned', "Painted shut since the Great Goo Incident."); }
        }
      }
    ]
  },

  // =====================================================
  kitchen: {
    music: 'kitchen',
    floor: { minX: 60, maxX: 590, minY: 300, maxY: 385 },
    entry: {
      default: [320, 350, 1],
      fromLab: [520, 345, -1]
    },
    draw(ctx, t, flags) { Art.drawKitchen(ctx, t, flags); },
    hotspots: [
      {
        name: 'lab door', rect: [536, 112, 84, 178], walkPos: [530, 350],
        verbs: {
          walk: async () => { playSfx('doorOpen'); goRoom('lab', 'fromKitchen'); },
          open: async () => { playSfx('doorOpen'); goRoom('lab', 'fromKitchen'); },
          look: async () => { await say('ned', "Back to the lab."); }
        }
      },
      {
        name: 'fridge', rect: [50, 118, 122, 192], walkPos: [200, 345], faceDir: -1,
        verbs: {
          look: async () => { await say('ned', "The fridge hums a tune. I don't recognize the key. Possibly E-coli minor."); },
          open: async () => {
            playSfx('doorOpen');
            await wait(300);
            playSfx('growl');
            await say('ned', "Something in there GROWLED at me.");
            playSfx('doorClose');
            await say('ned', "We shall never speak of the leftovers again.");
          },
          push: async () => { playSfx('nope'); await say('ned', "It's heavier than my future."); }
        }
      },
      {
        name: 'broom', rect: [170, 165, 44, 160], walkPos: [220, 345], faceDir: -1,
        visible: () => !flag('broomTaken'),
        verbs: {
          look: async () => { await say('ned', "A trusty broom. Reach: excellent. Dignity: minimal."); },
          pickup: async () => {
            setFlag('broomTaken');
            addItem('broom');
            await say('ned', "Broom: get! +2 to reaching things.");
          }
        }
      },
      {
        name: 'radio', rect: [432, 62, 90, 74], walkPos: [470, 340],
        visible: () => !flag('radioFell'),
        verbs: {
          look: async () => {
            await say('ned', "The professor's radio, blasting polka from the top shelf. There's a battery in there.");
            setFlag('knowsBattery');
          },
          pickup: async () => {
            playSfx('nope');
            await say('ned', "Way too high. I'd need arms like a basketball player. Or a broom.");
          },
          use: async () => { playSfx('nope'); await say('ned', "Can't reach the knobs from down here."); },
          pull: async () => { playSfx('nope'); await say('ned', "I can't even reach it, let alone pull it."); }
        },
        useItem: {
          broom: async () => {
            await say('ned', "Sorry, polka fans.");
            playSfx('boing');
            await wait(400);
            playSfx('crash');
            setFlag('radioFell');
            await say('narrator', "The radio plummets to the floor and explodes into modern art.");
            await say('ned', "Whoops. I mean: exactly as planned.");
          }
        }
      },
      {
        name: 'broken radio', rect: [430, 340, 96, 44], walkPos: [480, 350],
        visible: () => flag('radioFell'),
        verbs: {
          look: async () => {
            if (flag('batteryTaken')) await say('ned', "A very ex-radio.");
            else if (flag('radioOpen')) await say('ned', "The battery's right there.");
            else await say('ned', "A very ex-radio. The battery compartment is still shut.");
          },
          open: async () => {
            if (flag('radioOpen')) { await say('ned', "It's already open."); return; }
            playSfx('pickup');
            setFlag('radioOpen');
            await say('ned', "Battery compartment: open. There it is — one gorgeous AA battery.");
          },
          pickup: async () => {
            if (!flag('radioOpen')) { playSfx('nope'); await say('ned', "The battery hatch is shut. I should open it."); return; }
            await say('ned', "I just need the battery, not the shrapnel.");
          }
        }
      },
      {
        name: 'AA battery', rect: [520, 352, 36, 28], walkPos: [500, 355],
        visible: () => flag('radioFell') && flag('radioOpen') && !flag('batteryTaken'),
        verbs: {
          look: async () => { await say('ned', "One AA battery, barely used. By polka standards."); },
          pickup: async () => {
            setFlag('batteryTaken');
            addItem('battery');
            await say('ned', "Battery: mine. Science: imminent.");
          }
        }
      },
      {
        name: 'hot sauce', rect: [312, 202, 30, 44], walkPos: [330, 340],
        visible: () => !flag('sauceTaken'),
        verbs: {
          look: async () => { await say('ned', "Volcanic hot sauce. The bottle is sweating. Bottles shouldn't sweat."); },
          pickup: async () => {
            setFlag('sauceTaken');
            addItem('hotsauce');
            await say('ned', "Careful now... got it. My fingers are tingling through the glass.");
          }
        }
      },
      {
        name: 'table', rect: [252, 238, 156, 60], walkPos: [330, 345],
        verbs: {
          look: async () => { await say('ned', "The kitchen table. Scarred by a thousand experimental dinners."); },
          push: async () => { playSfx('boing'); await say('ned', "It squeaks two inches and gives up. Same, table. Same."); }
        }
      },
      {
        name: 'shelf', rect: [416, 112, 170, 34], walkPos: [470, 340],
        verbs: {
          look: async () => { await say('ned', "A high shelf with canned mysteries and, until recently, a radio."); },
          pickup: async () => { playSfx('nope'); await say('ned', "Too high. Story of my life."); }
        }
      }
    ]
  },

  // =====================================================
  garden: {
    music: 'garden',
    floor: { minX: 80, maxX: 560, minY: 315, maxY: 390 },
    entry: {
      default: [140, 355, 1],
      fromLab: [140, 355, 1]
    },
    draw(ctx, t, flags) { Art.drawGarden(ctx, t, flags); },
    actors: {
      plant: {
        x: 430, y: 372, textH: 250,
        draw(ctx, t, talking, flags) { Art.drawPlant(ctx, 430, 372, 1, t, talking, flags); }
      }
    },
    async onEnter() {
      if (flag('plantIntro')) return;
      setFlag('plantIntro');
      await wait(500);
      playSfx('growl');
      await say('plant', "WHO DARES ENTER THE GARDEN OF SNAPPY THE MAGNIFICENT?");
      await say('ned', "Uh. Ned. I'm here about the whole 'mulching the town' thing.");
      await say('plant', "The town will make EXCELLENT compost! And you're standing on my lawn.");
      await say('ned', "Technically it's the professor's lawn.");
      await say('plant', "DETAILS!");
    },
    hotspots: [
      {
        name: 'lab door', rect: [26, 145, 82, 180], walkPos: [120, 355],
        verbs: {
          walk: async () => { playSfx('doorOpen'); goRoom('lab', 'fromGarden'); },
          open: async () => { playSfx('doorOpen'); goRoom('lab', 'fromGarden'); },
          look: async () => { await say('ned', "The door back to the lab. And safety. Relative safety."); }
        }
      },
      {
        name: 'Snappy', rect: [340, 120, 180, 250], walkPos: [300, 365],
        verbs: {
          look: async () => { await say('ned', "Nine feet of angry snapdragon. The petals really tie the menace together."); },
          talkto: async () => {
            const i = await choose([
              "Would you consider NOT mulching the town?",
              "You know you're a houseplant, right?",
              "What's in the bowl?",
              "Never mind."
            ]);
            if (i === 0) {
              await say('ned', "Would you consider NOT mulching the town?");
              await say('plant', "Would YOU consider photosynthesizing? No? THEN WE HAVE NOTHING TO DISCUSS.");
            } else if (i === 1) {
              await say('ned', "You know you're a houseplant, right?");
              await say('plant', "I am an OUTDOOR plant now. I have TRANSCENDED the pot.");
              await say('ned', "You're literally still in the pot.");
              await say('plant', "IT'S A LIFESTYLE CHOICE!");
            } else if (i === 2) {
              await say('ned', "What's in the bowl?");
              await say('plant', "My plant food. Snacks fuel world domination. Touch it and become fertilizer.");
              setFlag('knowsBowl');
            } else {
              await say('ned', "Never mind.");
              await say('plant', "COWARD.");
            }
          },
          pickup: async () => { playSfx('nope'); await say('ned', "I'm not hugging the murder-plant."); },
          push: async () => { playSfx('growl'); await say('plant', "PUSH ME AGAIN AND I'LL PLANT YOU HEADFIRST."); },
          use: async () => { await say('ned', "Use him? For what, a very hostile hedge?"); }
        },
        give: {
          hotsauce: async () => {
            await say('ned', "Want some hot sauce, Snappy?");
            await say('plant', "I don't accept condiments from MAMMALS.");
            await say('ned', "Fine. Maybe I'll just season your food bowl instead...");
          }
        },
        useItem: {
          ray: async () => {
            if (flag('plantDistracted')) {
              await ENDING();
            } else {
              await say('ned', "Say cheese, Snappy!");
              playSfx('zap');
              await wait(300);
              await say('narrator', "Snappy whips aside. The beam shrinks an innocent garden gnome instead.");
              await say('plant', "HA! Too slow, mammal! My reflexes are UNBE-LEAF-ABLE!");
              await say('ned', "Ugh. I need him distracted first. And that pun was a war crime.");
            }
          },
          broom: async () => {
            playSfx('growl');
            await say('plant', "A BROOM? I EAT brooms for BREAKFAST.");
            await say('ned', "Noted. Keeping the broom.");
          }
        }
      },
      {
        name: 'food bowl', rect: [268, 345, 76, 32], walkPos: [280, 375],
        verbs: {
          look: async () => {
            if (flag('sauceInBowl')) await say('ned', "Snappy's food bowl, now with 100% more liquid regret.");
            else await say('ned', "'SNAPPY'. A big bowl of gross-looking plant food.");
          },
          pickup: async () => { playSfx('growl'); await say('plant', "PAWS OFF MY BOWL!"); },
          use: async () => { await say('ned', "I'm not eating plant food. Yet. College is expensive."); }
        },
        useItem: {
          hotsauce: async () => {
            if (flag('sauceInBowl')) { await say('ned', "It's spicy enough to violate a treaty already."); return; }
            await say('ned', "A little seasoning for the world's worst houseplant...");
            playSfx('glug');
            removeItem('hotsauce');
            setFlag('sauceInBowl');
            await wait(400);
            await say('plant', "Are you TOUCHING my food? ...Actually, it smells kind of great.");
            playSfx('glug');
            setFlag('plantDrinking');
            await say('narrator', "Snappy takes an enormous, confident slurp.");
            await wait(700);
            setFlag('plantDrinking', false);
            playSfx('hiccup');
            await say('plant', "HOT. HOT! WHY IS IT — HIC — HOT?!");
            setFlag('plantHiccups');
            setFlag('plantDistracted');
            playSfx('hiccup');
            await say('ned', "Now, while he's busy breathing fire... where's that shrink ray?");
          }
        }
      },
      {
        name: 'flowers', rect: [150, 320, 50, 42], walkPos: [180, 360],
        verbs: {
          look: async () => { await say('ned', "Normal flowers. They lean away from Snappy. Smart flowers."); },
          talkto: async () => { await say('ned', "Hang in there, little guys."); },
          pickup: async () => { await say('ned', "They've been through enough."); }
        }
      },
      {
        name: 'moon', rect: [482, 32, 76, 76], walkPos: [400, 355],
        verbs: {
          look: async () => { await say('ned', "A big cartoon moon. It's seen weirder nights than this. Barely."); }
        }
      },
      {
        name: 'fence', rect: [140, 216, 480, 70], walkPos: [350, 340],
        verbs: {
          look: async () => { await say('ned', "The fence leans at angles unknown to geometry."); },
          push: async () => { playSfx('boing'); await say('ned', "It leans a bit more. Art."); }
        }
      }
    ]
  }
};

async function ENDING() {
  await say('ned', "Hey Snappy! Smile!");
  playSfx('zap');
  await wait(400);
  playSfx('shrink');
  setFlag('plantHiccups', false);
  setFlag('plantShrunk');
  await wait(600);
  await say('plantSmall', "hic... what happened... why is the bowl ENORMOUS?");
  await say('ned', "You've been downsized, buddy. Budget cuts.");
  await say('plantSmall', "curse you, mammal... i was going to be SO much compost...");
  await say('prof', "NED! You did it! My snapdragon is adorable again!");
  await say('ned', "Just keep the Grow-O-Tonic on a higher shelf this time, Professor.");
  await say('prof', "Higher shelf. Yes. Genius. THIS is why you nearly have a degree!");
  await wait(600);
  endGame("Snappy spent the rest of his days as a mildly threatening bonsai. The town was never mulched. Ned got extra credit. The cuckoo, at last, knew peace.");
}
