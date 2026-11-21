// The story: six jobs Delia Cross feeds Jax Marlowe across one night in Port
// Vesper, each paying down his $8,000 debt. A mission is data — a briefing, a
// list of legs (go somewhere, be in a specific car, collect drops, clear
// thugs, beat the clock) — and main.js walks the legs in order. Finishing all
// six wins the game; the last one is a four-star getaway against a timer.
import { WORLD } from './config.js';

const B = WORLD.block;
const at = (col, row, dx = 60, dy = 60) => ({ x: col * B + dx, y: row * B + dy });

export const MISSIONS = [
  {
    title: 'First Run',
    brief: 'Delia: "A package is waiting at the docks. Bring it to Club Meridian — clean and quiet."',
    pay: 900,
    legs: [
      { kind: 'goto', at: at(0, 5, 210, 210), label: 'Pick up the package at the docks', radius: 46 },
      { kind: 'goto', at: at(3, 0, 210, 60), label: 'Deliver it to Club Meridian', radius: 46, wanted: 1 },
    ],
  },
  {
    title: 'Borrowed Wheels',
    brief: 'Delia: "A collector owes me a sports car. Take the gold coupe by the marina and garage it."',
    pay: 1200,
    legs: [
      { kind: 'steal', carColor: '#e0b13e', at: at(6, 4, 120, 300), label: 'Steal the gold coupe', radius: 60 },
      { kind: 'goto', at: at(6, 4, 210, 60), label: 'Park it at Vesper Garage', radius: 50, wanted: 2 },
    ],
  },
  {
    title: 'Three Drops',
    brief: 'Delia: "Cash went missing in three places at once. Grab every drop before the trail cools."',
    pay: 1500, time: 150,
    legs: [
      { kind: 'goto', at: at(2, 2, 60, 60), label: 'Cash drop 1 of 3 — midtown corner', radius: 42 },
      { kind: 'goto', at: at(5, 1, 210, 210), label: 'Cash drop 2 of 3 — the park', radius: 42, wanted: 2 },
      { kind: 'goto', at: at(1, 3, 60, 300), label: 'Cash drop 3 of 3 — west alley', radius: 42 },
    ],
  },
  {
    title: 'The Informant',
    brief: 'Delia: "Rico knows where the ledger is. Pick him up and get him to the safehouse — the police want him too."',
    pay: 1600,
    legs: [
      { kind: 'goto', at: at(7, 2, 120, 120), label: 'Pick up Rico at the airfield gate', radius: 46 },
      { kind: 'goto', at: at(4, 2, 210, 60), label: 'Drop Rico at the safehouse', radius: 48, wanted: 3 },
    ],
  },
  {
    title: 'Warehouse Manners',
    brief: 'Delia: "The Sartos are storing MY ledger in Cold Store 9. Clear their three guards and take it."',
    pay: 1800,
    legs: [
      { kind: 'goto', at: at(1, 5, 300, 210), label: 'Reach Cold Store 9 at the docks', radius: 55 },
      { kind: 'clear', at: at(1, 5, 300, 210), label: 'Clear the Sarto guards (aim with mouse, click / Space to shoot)', radius: 240 },
      { kind: 'goto', at: at(0, 5, 120, 120), label: 'Take the ledger from the warehouse door', radius: 44, wanted: 3 },
    ],
  },
  {
    title: 'Vice Tide',
    brief: 'Delia: "Last job. The ferry leaves at dawn — reach the harbour gate with the ledger. Every cop in Vesper will try to stop you."',
    pay: 1000, time: 120,
    legs: [
      { kind: 'goto', at: at(7, 5, 240, 210), label: 'Reach the harbour gate before the timer runs out', radius: 55, wanted: 4 },
    ],
  },
];

export function missionLegText(mission, legIndex) {
  if (!mission) return '';
  const leg = mission.legs[legIndex];
  return leg ? leg.label : '';
}
