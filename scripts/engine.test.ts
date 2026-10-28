/**
 * Lesson engine tests. Run with: npm run test:engine
 * node:test + node:assert, no dependencies.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_RECALLS,
  anticipatePause,
  compileLesson,
  moraCount,
  nextBlockStart,
  previousBlockStart,
  segmentAt,
} from "../lib/engine/compile.ts";
import type { Item, Lesson, Segment } from "../lib/engine/types.ts";
import { LESSONS, ITEM_INDEX, getCompiled } from "../lib/content.ts";

const item = (id: string, ja: string): Item => ({ id, ja, romaji: id, en: id });

function tiny(steps: Lesson["steps"], extra: Partial<Lesson> = {}): Lesson {
  return {
    id: "t",
    level: 1,
    number: 1,
    title: "t",
    summary: "t",
    reviewed: false,
    items: [item("a", "あ"), item("b", "いい"), item("c", "ううう")],
    steps,
    ...extra,
  };
}

const answersFor = (segs: Segment[], id: string) =>
  segs.filter((s) => s.kind === "answer" && s.itemId === id);

test("moraCount merges small kana and counts long marks", () => {
  assert.equal(moraCount("きょう"), 2);
  assert.equal(moraCount("コーヒー"), 4);
  assert.equal(moraCount("ありがとうございます"), 10);
});

test("anticipation: every prompt is cue -> pause -> answer -> pause", () => {
  const { segments } = compileLesson(
    tiny([{ type: "introduce", item: "a" }, { type: "prompt", item: "a" }]),
    new Map(),
  );
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].kind !== "answer") continue;
    assert.equal(segments[i - 1].kind, "pause");
    assert.equal(segments[i - 1].pauseFor, "anticipate");
    assert.equal(segments[i - 2].kind, "narration");
    assert.equal(segments[i + 1].pauseFor, "repeat");
  }
});

test("longer answers get longer pauses, within bounds", () => {
  assert.ok(anticipatePause("ありがとうございます") > anticipatePause("はい"));
  assert.ok(anticipatePause("はい") >= 2.5);
  assert.ok(anticipatePause("あ".repeat(80)) <= 6.5);
});

test("graduated recall: introduced items come back at growing gaps", () => {
  const steps: Lesson["steps"] = [{ type: "introduce", item: "a" }];
  for (let i = 0; i < 150; i++) steps.push({ type: "narrate", en: "filler words to let time pass" });
  const { segments } = compileLesson(tiny(steps), new Map());
  const times = answersFor(segments, "a").map((s) => s.t);
  assert.ok(times.length >= 3, `expected >=3 recalls, got ${times.length}`);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1], `gaps not growing: ${gaps}`);
  assert.ok(answersFor(segments, "a").every((s) => s.scheduled));
});

test("every introduced item is recalled at least MIN_RECALLS times", () => {
  const { segments } = compileLesson(
    tiny([
      { type: "introduce", item: "a" },
      { type: "introduce", item: "b" },
      { type: "introduce", item: "c" },
    ]),
    new Map(),
  );
  for (const id of ["a", "b", "c"]) {
    assert.ok(answersFor(segments, id).length >= MIN_RECALLS, id);
  }
});

test("recap flushes recalls before the steps after it", () => {
  const { segments } = compileLesson(
    tiny([{ type: "introduce", item: "a" }, { type: "recap" }, { type: "narrate", en: "the end" }]),
    new Map(),
  );
  const last = segments[segments.length - 1];
  assert.equal(last.text, "the end");
  assert.ok(answersFor(segments, "a").length >= MIN_RECALLS);
});

test("never prompts the same item twice in a row when another is due", () => {
  const { segments } = compileLesson(
    tiny([{ type: "introduce", item: "a" }, { type: "introduce", item: "b" }, { type: "recap" }]),
    new Map(),
  );
  const order = segments.filter((s) => s.kind === "answer").map((s) => s.itemId);
  for (let i = 1; i < order.length; i++) {
    if (order[i] === order[i - 1]) {
      // allowed only once the other item has finished its recalls
      const rest = order.slice(i);
      assert.ok(rest.every((x) => x === order[i]), `repeat at ${i}: ${order}`);
    }
  }
});

test("no scheduled recall right before an authored prompt of the same item", () => {
  for (const l of LESSONS) {
    const answers = getCompiled(l.id)!.segments.filter((s) => s.kind === "answer");
    for (let i = 1; i < answers.length; i++) {
      if (answers[i].scheduled || !answers[i - 1].scheduled) continue;
      assert.notEqual(answers[i - 1].itemId, answers[i].itemId, `${l.id}: ${answers[i].itemId} asked twice`);
    }
  }
});

test("review items from earlier lessons are recalled early", () => {
  const prev = new Map([["old", item("old", "おおお")]]);
  const steps: Lesson["steps"] = [];
  for (let i = 0; i < 20; i++) steps.push({ type: "narrate", en: "filler words to let time pass" });
  const { segments } = compileLesson(tiny(steps, { review: ["old"] }), prev);
  const first = answersFor(segments, "old")[0];
  assert.ok(first && first.t < 60, "review item should come back in the first minute");
});

test("unknown items fail loudly", () => {
  assert.throws(() => compileLesson(tiny([{ type: "prompt", item: "nope" }]), new Map()), /unknown item/);
});

test("segment times are monotonic and durationS matches", () => {
  const c = getCompiled("ja-1-01")!;
  for (let i = 1; i < c.segments.length; i++) {
    assert.ok(c.segments[i].t >= c.segments[i - 1].t);
  }
  const last = c.segments[c.segments.length - 1];
  assert.ok(Math.abs(last.t + last.durS - c.durationS) < 0.2);
});

test("segmentAt / block navigation", () => {
  const { segments } = getCompiled("ja-1-01")!;
  assert.equal(segmentAt(segments, 0), 0);
  const mid = Math.floor(segments.length / 2);
  assert.equal(segmentAt(segments, segments[mid].t), mid);
  const back = previousBlockStart(segments, mid);
  assert.ok(back <= mid && ["narration", "dialogue"].includes(segments[back].kind));
  const fwd = nextBlockStart(segments, mid);
  assert.ok(fwd > mid);
});

test("course content: compiles, ids unique, reviews only reach back", () => {
  const ids = new Set<string>();
  const seenItems = new Set<string>();
  for (const l of LESSONS) {
    assert.ok(!ids.has(l.id), `duplicate lesson ${l.id}`);
    ids.add(l.id);
    for (const r of l.review ?? []) assert.ok(seenItems.has(r), `${l.id} reviews "${r}" before it is taught`);
    for (const it of l.items) {
      assert.ok(!seenItems.has(it.id), `duplicate item ${it.id}`);
      seenItems.add(it.id);
    }
    const c = getCompiled(l.id)!;
    for (const it of l.items) {
      assert.ok(answersFor(c.segments, it.id).length >= MIN_RECALLS, `${l.id}: ${it.id} under-practised`);
    }
    assert.ok(c.durationS > 120, `${l.id} is suspiciously short`);
  }
  assert.equal(ITEM_INDEX.size, seenItems.size);
});
