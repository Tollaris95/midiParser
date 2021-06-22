var fingerDistance = function (f1, f2) {
    var key = f1.toString() + ',' + f2.toString();
    return params.fingDistance[key];
};

var fingerStretch = function (f1, f2) {
    var key = f1.toString() + ',' + f2.toString();
    return params.fingStretch[key];
};

var descMoveFormula = function (noteD, fingD, n1, n2, f1, f2) {
    // This is for situations where direction of notes and fingers is the same. You want to subtract finger distance in that case.
    var totalD = Math.ceil(noteD - fingD);
    var cost;

    // This adds a small amount for every additional halfstep over 24. Fairly representative of what it should be. 
    if (totalD > 24) {
        return params.moveHash[24] + ((totalD - 24) / 5);
    } else {
        cost = params.moveHash[totalD];
        cost += colorRules(n1, n2, f1, f2, fingD);
        return cost;
    }
};

var descThumbStretch = function (f1, f2) {
    var key = f1.toString() + ',' + f2.toString();
    return params.descThumbStretchVals[key];
};


var descThumbCost = function (noteD, fingD, n1, n2, f1, f2) {
    var stretch = descThumbStretch(f1, f2);
    var x = (noteD + fingD) / stretch;

    if (x > 10) {
        return ascMoveFormula(noteD, fingD);
    } else {
        var cost = ThumbCrossCostFunc(x);
        if (params.color[n1 % 12] === 'Black' && params.color[n2 % 12] === 'White') {
            cost += 8;
        }
        return cost;
    }
};


var ThumbCrossCostFunc = function (x) {
    return 0.0002185873295 * Math.pow(x, 7) - 0.008611946279 * Math.pow(x, 6) + 0.1323250066 * Math.pow(x, 5) - 1.002729677 * Math.pow(x, 4) +
        3.884106308 * Math.pow(x, 3) - 6.723075747 * Math.pow(x, 2) + 1.581196785 * x + 7.711241722;
};


var createCostDatabase = function () {
    var RHcostDatabase = {};
    for (var finger1 = 1; finger1 <= 5; finger1++) {
        for (var note1 = 21; note1 < 109; note1++) { // in MIDI land, note 21 is actually the lowest note on the piano, and 109 is the highest.
            for (var finger2 = 1; finger2 <= 5; finger2++) {
                for (var note2 = 21; note2 < 109; note2++) {
                    costAlgorithmRouter(note1, note2, finger1, finger2, RHcostDatabase);
                }
            }
        }
    }
    return RHcostDatabase;
};


var ascDescNoCrossCost = function (noteD, fingD, x, n1, n2, f1, f2) {
    var costFunc = function (x) {
        return -0.0000006589793725 * Math.pow(x, 10) - 0.000002336381414 * Math.pow(x, 9) + 0.00009925769823 * Math.pow(x, 8) +
            0.0001763353131 * Math.pow(x, 7) - 0.004660305277 * Math.pow(x, 6) - 0.004290746384 * Math.pow(x, 5) + 0.06855725903 * Math.pow(x, 4) +
            0.03719817227 * Math.pow(x, 3) + 0.4554696705 * Math.pow(x, 2) - 0.08305450359 * x + 0.3020594956;
    };
    var cost;

    /* If it's above 6.8, but below moveCutoff, then we use an additional formula because the current one
    has an odd shape to it where it goes sharply negative after 6.8  I know this appears janky, but after messing with other potential 
    regression formulas, I can't get any single one to match both the overall shape, and certainly specific Y values I want. So this seems like best option.
    */
    if (x > 6.8 && x <= params.moveCutoff) {
        return costFunc(6.8) + ((x - 6.8) * 3);
    } else {
        cost = costFunc(x);
        cost += colorRules(n1, n2, f1, f2);
        return cost;
    }
};


var ascThumbStretch = function(f1,f2) {
    var key = f1.toString() + ',' + f2.toString();
    return params.ascThumbStretchVals[key];
};


var ascThumbCost = function (noteD, fingD, n1, n2, f1, f2) {
    var stretch = ascThumbStretch(f1, f2);
    var x = (noteD + fingD) / stretch;

    // If it's over 10, again use the move formula
    if (x > 10) {
        return ascMoveFormula(noteD, fingD);
    } else {
        var cost = ThumbCrossCostFunc(x);
        if (params.color[n1 % 12] === 'White' && params.color[n2 % 12] === 'Black') {
            cost += 8;
        }
        return cost;
    }
};

var params = require('./fingersAlgoParameters.js');



var colorRules = function (n1, n2, f1, f2, fingD) {
    // If you're moving up from white to black with pinky or thumb, that's much harder than white-to-white would be. So we're adding some amount.
    if (params.color[n1 % 12] === 'White' && params.color[n2 % 12] === 'Black') {
        if (f2 === 5 || f2 === 1) { return 4; } // Using thumb or pinky on black is extra expensive
        if (fingD === 0) { return 4; } // Using same finger is extra expensive
    }
    if (params.color[n1 % 12] === 'Black' && params.color[n2 % 12] === 'White') {
        if (f1 === 5 || f1 === 1) { return 4; } // Moving from thumb or pinky that's already on black is extra expensive
        if (fingD === 0) { return -1; } // Moving black to white with same finger is a slide. That's easy and common. reduce slightly.
    }
    return 0; // If none of the rules apply, then don't add or subtract anything
};


var ascMoveFormula = function (noteD, fingD, n1, n2, f1, f2) {
    // This is for situations where direction of notes and fingers are opposite, because either way, you want to add the distance between the fingers.

    // The Math.ceil part is so it def hits a value in our moveHash. This could be fixed if I put more resolution into the moveHash
    var totalD = Math.ceil(noteD + fingD);
    var cost;

    // This adds a small amount for every additional halfstep over 24. Fairly representative of what it should be. 
    if (totalD > 24) {
        return params.moveHash[24] + ((totalD - 24) / 5);
    } else {
        cost = params.moveHash[totalD];
        cost += colorRules(n1, n2, f1, f2, fingD);
        return cost;
    }
};


var costAlgorithmRouter = function (n1, n2, f1, f2, costDatabase) {
    var key = n1.toString() + ',' + n2.toString() + ',' + f1.toString() + ',' + f2.toString();
    var noteD = Math.abs(n2 - n1);
    var fingD = fingerDistance(f1, f2);

    // Handles cases where the note is ascending or descending and you're using the same finger. That's move formula
    // it doesn't matter whether we send it to ascMoveFormula or descMoveFormula, since in either case, FingD is zero.
    if (Math.abs(n2 - n1) > 0 && f2 - f1 === 0) {
        costDatabase[key] = ascMoveFormula(noteD, fingD, n1, n2);
    }
    // Handles ascending notes and descending fingers, but f2 isn't thumb
    // means you're crossing over. Bad idea. Only plausible way to do this is picking your hand up. Thus move formula
    else if (n2 - n1 >= 0 && f2 - f1 < 0 && f2 !== 1) {
        costDatabase[key] = ascMoveFormula(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles descending notes with ascending fingers where f1 isn't thumb
    // means your crossing over. Same as above. Only plausible way is picking hand up, so move formula.
    else if (n2 - n1 < 0 && f2 - f1 > 0 && f1 !== 1) {
        costDatabase[key] = ascMoveFormula(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles ascending notes, where you start on a finger that isn't your thumb, but you land on your thumb. 
    // thus bringing your thumb under. 
    else if (n2 - n1 >= 0 && f2 - f1 < 0 && f2 === 1) {
        costDatabase[key] = ascThumbCost(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles descending notes, where you start on your thumb, but don't end with it. Thus your crossing over your thumb.
    else if (n2 - n1 < 0 && f1 === 1 && f2 !== 1) {
        costDatabase[key] = descThumbCost(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles ascending or same note, with ascending or same finger
    // To be clear... only remaining options are (n2-n1 >= 0 && f2-f1 > 0 || n2-n1 <= 0 && f2-f1 < 0)
    else {
        var stretch = fingerStretch(f1, f2);
        var x = Math.abs(noteD - fingD) / stretch;
        if (x > params.moveCutoff) {
            costDatabase[key] = descMoveFormula(noteD, fingD, n1, n2, f1, f2);
        } else {
            costDatabase[key] = ascDescNoCrossCost(noteD, fingD, x, n1, n2, f1, f2);
        }
    }

};


var createLHCostDatabase = createLHCostDatabase = function () {
    var LHcostDatabase = {};
    for (var finger1 = 1; finger1 <= 5; finger1++) {
        for (var note1 = 21; note1 < 109; note1++) { // in MIDI land, note 21 is actually the lowest note on the piano, and 109 is the highest.
            for (var finger2 = 1; finger2 <= 5; finger2++) {
                for (var note2 = 21; note2 < 109; note2++) {
                    LHcostAlgorithmRouter(note1, note2, finger1, finger2, LHcostDatabase);
                }
            }
        }
    }
    return LHcostDatabase;
};


var LHcostAlgorithmRouter = function (n1, n2, f1, f2, costDatabase) {
    var key = n1.toString() + ',' + n2.toString() + ',' + f1.toString() + ',' + f2.toString();
    var noteD = Math.abs(n2 - n1);
    var fingD = fingerDistance(f1, f2);

    // Handles cases where the note is ascending or descending and you're using the same finger. That's move formula
    // it doesn't matter whether we send it to ascMoveFormula or descMoveFormula, since in either case, FingD is zero.
    if (noteD > 0 && f2 - f1 === 0) {
        costDatabase[key] = ascMoveFormula(noteD, fingD, n1, n2);
    }
    // Handles descending notes and descending fingers, but f2 isn't thumb
    // means you're crossing over. Bad idea. Only plausible way to do this is picking your hand up. Thus move formula
    else if (n2 - n1 <= 0 && f2 - f1 < 0 && f2 !== 1) {
        costDatabase[key] = ascMoveFormula(noteD, fingD);
    }
    // This handles ascending notes with ascending fingers where f1 isn't thumb
    // means your crossing over. Same as above. Only plausible way is picking hand up, so move formula.
    else if (n2 - n1 > 0 && f2 - f1 > 0 && f1 !== 1) {
        costDatabase[key] = ascMoveFormula(noteD, fingD);
    }
    // This handles descending notes, where you start on a finger that isn't your thumb, but you land on your thumb. 
    // thus bringing your thumb under. 
    else if (n2 - n1 <= 0 && f2 - f1 < 0 && f2 === 1) {
        costDatabase[key] = ascThumbCost(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles ascending notes, where you start on your thumb, but don't end with it. Thus your crossing over your thumb.
    else if (n2 - n1 >= 0 && f1 === 1 && f2 !== 1) {
        costDatabase[key] = descThumbCost(noteD, fingD, n1, n2, f1, f2);
    }
    // This handles ascending or same note, with descending fingers or it takes descending notes with ascending fingers
    // to be clear... only remaining options are (n2-n1 >= 0 && f2-f1 < 0 || n2-n1 <= 0 && f2-f1 > 0)
    else {
        var stretch = fingerStretch(f1, f2);
        var x = Math.abs(noteD - fingD) / stretch;
        if (x > params.moveCutoff) {
            costDatabase[key] = descMoveFormula(noteD, fingD);
        } else {
            costDatabase[key] = ascDescNoCrossCost(noteD, fingD, x, n1, n2, f1, f2);
        }
    }
};


var endCap = [
    { notes: ['e', 'e'], fingers: [1, -1] }
];


var getAllFingerOptions = function (numFingers) {
    var results = [];
    var fingOptions = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

    var walker = function (numFingers, currentFingers, fingerOptions) {
        if (currentFingers.length === numFingers) {
            results.push(currentFingers.slice());
            return;
        }

        for (var i = 0; i < fingerOptions.length; i++) {
            currentFingers.push(fingerOptions[i]);
            var current = currentFingers;
            var temp = fingerOptions.slice();
            temp.splice(0, i + 1);
            walker(numFingers, current, temp);
            currentFingers.pop();
        }
    };
    walker(numFingers, [], fingOptions);
    return results;
};


var allFingerOptions = {};
for (var i = 1; i <= 10; i++) {
    allFingerOptions[i] = getAllFingerOptions(i);
};


var makeNoteNode = function (notes, fingers) {
    //the notes and fingers property can have either one or multiple notes. 
    this.notes = notes;     //this is an array of array pairs, with notes and startTimes.
    this.fingers = fingers; // this is an array of finger options. 
    this.nodeScore = 0;
    this.bestPrev = undefined;
};


var makeLayer = function (notes) {
    var sortedNotes = notes.sort(function (a, b) { return a[0] - b[0] });
    var layer = [];
    var options = allFingerOptions[sortedNotes.length]; // this grabs the appropriate list of options. 
    for (var i = 0; i < options.length; i++) {
        var fingerChoice = options[i];
        var node = new makeNoteNode(sortedNotes, fingerChoice);
        layer.push(node);
    }
    return layer;
};


var findNoteHolder = function (curPlaying, note) {
    for (var i = 0; i < curPlaying.length; i++) {
        if (curPlaying[i][0] === note) {
            return i;
        }
    }
};


var RHcostDb = createCostDatabase();
var LHcostDb = createLHCostDatabase();



var computeRHCost = function (n1, n2, f1, f2) {
    if (n1 === 'e' || n2 === 'e') {
        return 0;
    }
    var key = n1 + ',' + n2 + ',' + f1 + ',' + f2;
    var cost = RHcostDb[key];
    var distBelowC = 60 - n2;
    cost += distBelowC > 0 ? distBelowC : 0; //this is for giving a slight tax to the left hand being above middle c.
    return cost;
};


var computeLHCost = function (n1, n2, f1, f2) {
    if (n1 === 'e' || n2 === 'e') {
        return 0;
    }
    f1 = Math.abs(f1);
    f2 = Math.abs(f2);
    var key = n1 + ',' + n2 + ',' + f1 + ',' + f2;
    var cost = LHcostDb[key];
    var distAboveC = n2 - 60;
    cost += distAboveC > 0 ? distAboveC : 0; //this is for giving a slight tax to the left hand being above middle c.
    return cost;
};



exports.FingeringAlgorithm = (midiData) => {
        // This whole thing is an example of Viterbi's algorithm, if you're curious.

        var dataWithStarts = addStartTimes(midiData);
        // This checks if we already have the best path data for that song on the client.
        // TODO: Refactor into better response object that wouldn't need iteration
        // app.preComputed = app.preComputed || [];
        // for (var i = 0; i < app.preComputed.length; i++) {
        //     if (app.preComputed[i].title === app.currentSong) {
        //         var bestPath = app.preComputed[i].BestPathObj;
        //         distributePath(bestPath, dataWithStarts);
        //         return;
        //     }
        // }
        var noteTrellis = makeNoteTrellis(dataWithStarts);

        // Traversing forward, computing costs and leaving our best path trail
        // Go through each layer (starting at 2nd, because first is just endCap)
        for (var layer = 1; layer < noteTrellis.length; layer++) {
            // Go through each node in each layer
            for (var node1 = 0; node1 < noteTrellis[layer].length; node1++) {
                var min = Infinity;
                // Go through each node in prev layer.
                for (var node2 = 0; node2 < noteTrellis[layer - 1].length; node2++) {
                    var curNode = noteTrellis[layer][node1];
                    var prevNode = noteTrellis[layer - 1][node2];
                    var totalCost = prevNode.nodeScore || 0;
                    var curData = getSplitData(curNode);
                    var prevData = getSplitData(prevNode);

                    var curRH = curData.right;
                    var prevRH = prevData.right;
                    // If you have something in a given hand, we have to compare it with the last thing in that hand.
                    // So if the layer directly previous has nothing, we keep tracing back till we find it.
                    if (curRH.notes.length > 0) {
                        var counter = 2;
                        var tempPrevNode = prevNode;
                        while (prevRH.notes.length === 0) {
                            var bestPrevious = tempPrevNode.bestPrev;
                            var prevBestNode = noteTrellis[layer - counter][bestPrevious];
                            prevRH = getSplitData(prevBestNode).right;
                            counter++;
                            tempPrevNode = prevBestNode;
                        }
                    }
                    var curLH = curData.left;
                    var prevLH = prevData.left;
                    if (curLH.notes.length > 0) {
                        var counter = 2;
                        var tempPrevNode = prevNode;
                        while (prevLH.notes.length === 0) {
                            var bestPrevious = tempPrevNode.bestPrev;
                            var prevBestNode = noteTrellis[layer - counter][bestPrevious];
                            prevLH = getSplitData(prevBestNode).left;
                            counter++;
                            tempPrevNode = prevBestNode;
                        }
                    }

                    var RHCost = calcCost(curRH, prevRH, curLH, 'RH');
                    var LHCost = calcCost(curLH, prevLH, curRH, 'LH');

                    totalCost += RHCost + LHCost;


                    if (totalCost < min) {
                        min = totalCost;
                        curNode.nodeScore = totalCost;
                        curNode.bestPrev = node2;
                    }
                }

            }
        }
        /* Now we need to go backwards and collect the best path.
        the currentNode variable is initialized to be the lowest score of the final layer.*/
        var currentNode = findMin(noteTrellis[noteTrellis.length - 1]);

        /* From this point, we put the finger for that node in the array, then we track back to it's
        best previous node, record it's finger, and repeat till we get to the end.
        We set the continuation condition to be greater than zero, because we don't actually want zero,
        since zero is just our start object.*/

        var bestPathObj = {};
        for (var j = noteTrellis.length - 1; j > 0; j--) {
            var nodeObj = noteTrellis[j][currentNode];
            var fingers = nodeObj.fingers;
            var notes = nodeObj.notes;
            for (var k = 0; k < notes.length; k++) {
                var note = notes[k][0];
                var startTime = notes[k][1];
                var finger = fingers[k];
                var key = note + ',' + startTime;
                bestPathObj[key] = finger;
            }
            currentNode = nodeObj.bestPrev;
        }

        // Was using this as simple way post songs to our Database. Didn't want to write a whole form yet.
        // and don't want to allow arbitrary songs to get posted.

        // $.post('http://localhost:3000/upload',
        // {
        //   title: 'Yesterday',
        //   artist: 'The Beatles',
        //   BestPathObj: bestPathObj,
        // });
        distributePath(bestPathObj, dataWithStarts);
        return midiData
    };


    function addStartTimes(midiData) {
        var curStartTime = 0;
        for (var pair = 0; pair < midiData.length; pair++) {
            var eventData = midiData[pair][0].event;
            if (eventData.subtype === 'noteOff') {
                curStartTime += eventData.deltaTime;  //deltaTime is really 'ticksToNextEvent'
            } else if (eventData.subtype === 'noteOn') {
                eventData.startTime = curStartTime;
                curStartTime += eventData.deltaTime;
            }
        }
        return midiData;
    };


    function distributePath(bestPathObj, midiData) {
        var nowPlaying = {};
        for (var each in bestPathObj) {
            bestPathObj[each] = +bestPathObj[each];
        }
        for (var pair = 0; pair < midiData.length; pair++) {
            var eventData = midiData[pair][0].event;
            var note = eventData.noteNumber;
            if (eventData.subtype === 'noteOn') {
                var startTime = eventData.startTime;
                var key = note + ',' + startTime;
                var finger = bestPathObj[key];
                eventData.finger = finger;
                nowPlaying[note] = finger;// Adding current note to nowPlaying object. Will overwrite previous fingering of same note, which is what we want.
            }
            if (eventData.subtype === 'noteOff') {
                eventData.finger = nowPlaying[note]; // This gets the same finger from the noteOn event that 'caused' this noteOff event.
            }
        }
    };


    function makeNoteTrellis(midiData) {
        // debugger;
        var curPlaying = [];
        var lastWasOn = false;
        var trellis = [];
        trellis.push(endCap); //this is convenience so we don't have to have special conditions for the traversal loop

        for (var pair = 0; pair < midiData.length; pair++) {
            var eventData = midiData[pair][0].event;
            var note = eventData.noteNumber;
            var newLayer, notePlace;
            if (eventData.subtype === 'noteOn') {
                var startTime = eventData.startTime;
                curPlaying.push([note, startTime]);
                lastWasOn = true;
            }
            if (eventData.subtype === 'noteOff') {
                if (lastWasOn) {
                    //must pass it a copy of curPlaying, or else everythang gits all messed up
                    newLayer = makeLayer(curPlaying.slice());
                    trellis.push(newLayer);
                    notePlace = findNoteHolder(curPlaying, note);
                    curPlaying.splice(notePlace, 1);
                    lastWasOn = false;
                } else {
                    notePlace = findNoteHolder(curPlaying, note);
                    curPlaying.splice(notePlace, 1);
                    lastWasOn = false;
                }
            }
        }
        return trellis;
    };


    function getSplitData(node) {
        var result = {
            right: {
                notes: [],
                fingers: []
            },
            left: {
                notes: [],
                fingers: []
            }
        };
        for (var i = 0; i < node.fingers.length; i++) {
            if (node.fingers[i] > 0) {
                result.right.fingers.push(node.fingers[i]);
                result.right.notes.push(node.notes[i]);
            } else {
                result.left.fingers.push(node.fingers[i]);
                result.left.notes.push(node.notes[i]);
            }
        }
        return result;
    };


    function calcCost(curNode, prevNode, otherHandCurNode, whichHand) {
        var costFunction = whichHand === 'RH' ? computeRHCost : computeLHCost;
        var totalCost = 0;
        // If curNode has nothing, then that means there are no immediate notes to try out for that same hand. Thus it's temporarily only right or only left.
        // We need to return what the cost would be to move to that other note. (ie. if your left hand doens't need to play anything,
        // but your right hand is playing a note 2 octaves up, we should return that cost of the left hand jumping up to play that right hand note.)

        for (var i = 0; i < curNode.notes.length; i++) {       // Go through each note in the current Node
            var curNote = curNode.notes[i][0];  // This grabs just the note, because the notes property has pairs of values. First is note, second is starTime.
            var curFinger = curNode.fingers[i];
            var hasNextNote = curNode.notes[i + 1] || false;
            var nextFinger = curNode.fingers[i + 1];
            if (hasNextNote) {
                // This helps add the "state" cost of actually using those fingers for that chord. This isn't captured by the transition costs 
                totalCost += costFunction(curNote, hasNextNote[0], curFinger, nextFinger);
            } else {
                totalCost += whichHand === 'RH' ? 60 - curNote : curNote - 60; // This adds a 'stateCost' for one note that helps seperate the hands where they should be.
            }
            for (var j = 0; j < prevNode.notes.length; j++) {   // Add up scores for each of the previous nodes notes trying to get to current node note.
                var prevNote = prevNode.notes[j][0];
                var prevFinger = prevNode.fingers[j];

                var transCost = costFunction(prevNote, curNote, prevFinger, curFinger);
                totalCost += transCost;
            }
        }
        return totalCost;
    };


    function findMin(layer) {
        var minNode;
        var minScore = Infinity;
        for (var node = 0; node < layer.length; node++) {
            if (layer[node].nodeScore < minScore) {
                minScore = layer[node].nodeScore;
                minNode = node;
            }
        }
        return minNode;
    };