# Nimantran — Product job specification

## Product

Nimantran is an adults-only platform for discovering and hosting interest-led social gatherings across Delhi NCR. Its personality is contemporary, desi and Bollywood-inspired, with a simple choice between finding a gathering and hosting one.

## Job to be done

When I want to meet people or make plans, help me find a nearby gathering that fits my interests, budget and comfort level, understand what is included, introduce myself to the host and receive clear confirmation before attending.

For hosts: help me describe a gathering, communicate its inclusions and rules, review introductions, approve guests within capacity and manage attendance.

## Intended users

- Adults aged 18 and over who want new social experiences, including solo attendees and people new to the city.
- Independent organisers, activity hosts and venue operators bringing people together around shared interests.

## Core experience

1. Browse by category, city, date, budget, age eligibility, atmosphere and sober/solo-friendly preferences.
2. Read the event description, price, inclusions, house rules and host information.
3. Sign in with Google, complete an adult profile and send an introduction with a join request.
4. The host reviews the request and approves or declines it. Free-event approval produces a confirmed booking.
5. The guest receives a category-themed invitation and access to the private venue details.
6. The host checks in the guest; after the event ends, checked-in attendees may review it.

## Design and engineering requirements

Use a responsive, accessible interface with illustrated category collections, readable event information, simple forms, useful error/empty states and a list/map discovery toggle. Hosting uses one event date and start/end times in IST, including overnight end times. Store shared records in Supabase PostgreSQL and enforce ownership, capacity and private-address access in the backend.

## Scope boundary

This release supports the free-event journey after Supabase setup. Paid checkout, host payouts and the proposed referral credits are not active. Do not describe a pending request as a confirmed ticket, invent attendance/reviews, or present illustrative events as real listings.

## Acceptance criteria

A host can publish a valid event; a separate adult account can request a place; only that host can approve; confirmed bookings respect capacity; only authorised users can access private addresses; confirmed guests can download their invitations; only checked-in attendees can review after the event ends.

## Current verification status

The latest code has passed 73 unit tests, type checks, static/full builds, and browser HTTP-fixture journeys including Google OAuth and host/guest booking flows. Database access checks passed during implementation. These are local checks, not a claim that a real hosted Google login or cross-device booking has passed. The owner last reported the Supabase project as paused; it must be resumed and the hosted flow verified for reviewer access. Checkpoint approval is determined by the submission platform, not by this document.
