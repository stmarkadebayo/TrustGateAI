# TrustGateAI Product Direction

## Overview

TrustGateAI is an open-source, no-signup audit and compliance assistant for real review teams.

It is **not** being built as a full enterprise compliance platform or case-management system.
It **is** being built as a strong, practical, transparent proof of concept that real audit and compliance teams can use for first-pass review work.

The product should be:
- free and open source
- easy to run locally
- easy to understand
- useful without a database
- useful without mandatory AI configuration
- transparent about what it checked, what it flagged, and what it could not verify

The core principle is:

> ingest -> analyze -> explain -> hand off to human judgment

TrustGateAI does not make final compliance or fraud decisions.
It helps teams review faster, more consistently, and with better documentation.

## Product Scope

TrustGateAI has 3 modules:

1. `audit`
2. `verify`
3. `chat`

There is no `/report` module in the current direction.

## Primary Users

Primary users are small to medium audit and compliance teams that already work with:
- spreadsheets
- PDFs
- scanned documents
- emails
- shared folders
- manual review checklists

These teams may not have expensive internal tooling, but they still need to:
- review transactions
- verify support documents
- answer policy/compliance questions
- prepare notes for escalation or signoff

## Geographic Focus

The initial target geography is:
- United States
- Nigeria

TrustGateAI should support both using a **document pack model** and **country-specific review logic** layered on top of shared core controls.

## What “Solid” Means

For this project, “solid” does **not** mean enterprise-grade.

It means:
- the workflows are easy to use
- the checks are visible and understandable
- the findings are useful to real reviewers
- the outputs are honest about limitations
- the app degrades gracefully when optional integrations are missing
- the system feels credible to audit and compliance teams

## Product Philosophy

### 1. Deterministic first

Core controls should be rule-based and inspectable.

AI should be used for:
- explanation
- summarization
- structuring extracted content
- grounded compliance answers

AI should **not** be the source of truth for:
- audit rule definition
- final document authenticity decisions
- unsupported policy answers

### 2. Multi-file review, not single-file novelty

Real audit and compliance work usually involves related files and supporting evidence packs.

TrustGateAI should therefore focus on:
- **multi-file audit review**
- **document bundle verification**

Instead of:
- one isolated spreadsheet upload
- one isolated document upload

### 3. Coverage transparency

Every module should clearly report:
- what inputs were provided
- what checks ran
- what checks were skipped
- what evidence supported each finding
- what remains uncertain

This is one of the most important trust features in the product.

## Module Direction

## Audit Module

### Purpose

The `audit` module helps reviewers analyze related financial and procurement records to find suspicious patterns, missing links, and inconsistencies.

### Real user story

A reviewer receives several exports from finance or procurement and needs a fast first-pass analysis before signoff, escalation, or manual sampling.

### Input model

The audit unit of work is a **review pack**, not a single file.

Supported file roles:
- invoices
- payments
- purchase orders
- vendors
- receipts or delivery evidence

Users should be able to upload:
- one file
- several files
- any partial subset of these roles

The product must clearly indicate what level of analysis is possible based on what was uploaded.

### Core workflow

1. User uploads one or more files
2. System infers file role and columns where possible
3. User confirms or adjusts file role and key mappings if needed
4. Data is normalized into a canonical audit schema
5. Single-file rules run
6. Cross-file matching rules run where required supporting files are available
7. Results are grouped into:
   - high-priority findings
   - lower-priority anomalies
   - coverage gaps
8. User exports the analysis as structured output

### Canonical audit data model

Audit normalization should aim to capture:
- transaction or invoice id
- vendor or payee
- amount
- currency
- invoice date
- payment date
- PO or contract reference
- receipt or goods-received reference
- status or approval state
- source file and row reference

### Shared audit controls

These controls apply across both US and Nigeria:
- duplicate invoice ids
- duplicate vendor + amount + near-date patterns
- invalid or missing dates
- non-positive amounts
- amount outliers
- repeated same-vendor payments in short windows
- vendor concentration anomalies
- missing invoice/PO/payment linkage
- payment greater than referenced invoice or PO
- split-payment patterns below approval thresholds
- round-number concentration
- missing required support fields

### Cross-file controls

These are especially important once multi-file upload is supported:
- invoice-to-PO match
- payment-to-invoice match
- payment-to-PO amount consistency
- vendor consistency across files
- missing referenced record
- duplicate identifiers across files
- same invoice paid multiple times
- receipt/delivery evidence missing for payment or invoice record

### Coverage reporting

The audit output must explicitly say when checks were not run, for example:
- no PO file uploaded
- vendor master not provided
- receipts missing
- insufficient reference keys for 3-way matching

This should be treated as a first-class output, not a footnote.

## Verify Module

### Purpose

The `verify` module helps reviewers inspect a submission bundle of business documents for:
- completeness
- internal consistency
- cross-document consistency
- plausibility
- optional registry/reference matching

### Real user story

A compliance officer receives a vendor submission, onboarding pack, invoice support pack, or qualification packet and wants a fast, structured first-pass review.

### Input model

The verify unit of work is a **document bundle**, not a single document.

Users should be able to upload:
- one primary document
- several supporting documents

Supported file types:
- PDF
- PNG
- JPG
- JPEG

### Submission types

The first product direction should support bundle-level review for:
- vendor onboarding pack
- invoice support pack
- authorization/certificate review
- generic compliance packet

Each submission type should define:
- expected document classes
- required documents
- optional supporting documents
- relevant cross-document checks

### Verification layers

Verification should be broken into 4 layers:

1. **Document integrity**
   - can the file be read?
   - was text extracted?
   - are expected fields present?
   - does the structure look plausible?

2. **Cross-document consistency**
   - do names match?
   - do dates align?
   - do identifiers conflict?
   - do amounts and references line up?

3. **Registry/reference validation**
   - can extracted identifiers be checked against trusted references?
   - if not configured, say so clearly

4. **Submission completeness**
   - are required supporting docs present for this submission type?

### Output model

The verify result should separate:
- extracted fields
- findings
- missing documents
- cross-document conflicts
- registry status
- verification coverage
- final recommendation:
  - pass
  - review
  - fail

The app must never imply that “pass” means legally guaranteed authenticity.

## Country-Specific Document Pack Model

### Why this model

US and Nigeria have different document ecosystems, regulatory expectations, and common review artifacts.

TrustGateAI should not try to solve this with one universal set of hardcoded document assumptions.

Instead, it should use:
- a **shared core verifier**
- plus **country-specific document packs**

### Pack structure

Each country pack should define:
- supported document classes
- expected field patterns
- likely identifiers
- required/optional supporting docs by submission type
- pack-specific consistency rules
- optional external registry/reference adapters

Current integration direction:
- **United States:** use SAM.gov as the first real registry/API-backed reference source where configuration is available
- **Nigeria:** use CAC public search as an assisted corroboration path, with NIPEX/NOGIC JQS treated as important domain references even where a clean public API is not available

### Shared core

The shared core should handle:
- OCR and text extraction
- OCR retry/preprocessing for weak image scans where lightweight OSS tooling can improve yield
- document classification
- metadata extraction
- generic field extraction
- generic integrity signals
- cross-document comparison framework
- coverage and limitation reporting

### Nigeria document pack

The Nigeria pack should eventually support review logic around:
- CAC-related business identity documents
- tax clearance style documents
- NCDMB or local content support docs
- NIPEX/JQS-style qualification or vendor docs
- OEM authorization letters
- invoice support and procurement documentation

Nigeria-specific checks should focus on:
- expected identifiers
- supporting document completeness
- consistency of vendor identity across documents
- local-content-related documentation presence where relevant

Nigeria-assisted verification direction:
- CAC public search should be used as the first assisted corroboration path for registration-style documents
- NOGIC JQS and NipeX/NIPEX should be treated as key qualification references even if automated verification remains partial

### US document pack

The US pack should eventually support review logic around:
- W-9 or vendor tax identity support
- certificate of insurance
- business registration materials
- vendor registration references
- authorization letters
- invoice support documentation
- procurement support records

US-specific checks should focus on:
- business identity consistency
- tax/vendor support completeness
- invoice/supporting record coherence
- completeness of packet relative to review purpose

US integration direction:
- SAM.gov should be the first real API-backed entity reference target
- W-9 and certificate-of-insurance review should remain mostly document/bundle validation unless a clean supporting source is intentionally added

### Pack implementation rules

Country packs should be:
- additive
- explicit
- inspectable
- removable or replaceable

They should not be deeply coupled to the shared engine.

## Chat Module

### Purpose

The `chat` module is a grounded compliance assistant.

It helps users answer review-process and compliance questions without digging manually through multiple guidance docs.

### What chat should do

- answer from local curated corpus only
- cite supporting passages
- explain review expectations in plain language
- help junior analysts move faster
- refuse unsupported questions cleanly

### What chat should not do

- answer from unsupported model memory
- invent legal requirements
- present uncertain answers as authoritative

### Corpus direction

The chat corpus should be structured into:
- general audit controls
- procurement controls
- document review guidance
- Nigeria-specific compliance/reference material
- US-specific compliance/reference material
- glossary and workflow guidance

The corpus should support both:
- policy questions
- process questions

## UX Direction

### Shared UX principles

The UI should feel:
- clear
- professional
- work-focused
- easy to scan

It should avoid:
- gimmicky AI presentation
- marketing-heavy layout
- mystery outputs

### Audit UX

Audit should show:
- uploaded files and assigned roles
- inferred mappings
- analysis coverage
- findings grouped by severity
- evidence references
- exported JSON/Markdown

### Verify UX

Verify should show:
- uploaded bundle contents
- detected document classes
- extracted fields
- missing expected documents
- cross-document conflicts
- registry check status
- coverage limitations
- exported JSON/Markdown

### Chat UX

Chat should show:
- answer
- cited passages
- groundedness note
- refusal when support is weak

## Architecture Direction

### Runtime model

The application remains:
- public
- no-signup
- no mandatory database
- transient by default

### Analysis model

Analysis should be based on:
- deterministic rules
- explicit field extraction
- optional AI explanation
- optional configured registry or provider adapters

### No-DB constraint

Because the project should stay lightweight and easy to run, there should be no required persistence layer.

Instead, results should be:
- generated per review session
- returned immediately
- exportable as JSON and Markdown

This still supports real team usage because many audit/compliance teams can use exported output in their existing workflow.

## Output Standard

Every module should produce outputs that are:
- readable
- structured
- exportable
- limitation-aware

Outputs must clearly distinguish:
- deterministic findings
- AI explanation
- missing coverage
- unresolved uncertainty

## Non-Goals

TrustGateAI is not currently trying to be:
- an enterprise compliance platform
- a case management system
- a legal authority
- a final fraud adjudication engine
- a guaranteed authenticity engine

## Roadmap Direction

### Immediate next build direction

1. Redesign `audit` around multi-file review packs
2. Redesign `verify` around document bundles
3. Implement country-specific document pack architecture for US and Nigeria
4. Expand `chat` corpus to include US-specific and Nigeria-specific content
5. Improve result coverage reporting across all modules

### Quality target

The target outcome is:

> a very useful, easy-to-run, open-source proof of concept that real audit and compliance teams can use for faster first-pass review

That is the standard the product should be judged against.
