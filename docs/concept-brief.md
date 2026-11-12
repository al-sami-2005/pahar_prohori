# **Pahar Prohori ( পা�হা�ড়প্রহারী� )** 

### **The Hill Guardian — a space-to-ground landslide early warning system for Chattogram** 

NASA Space Apps Challenge 2026  ·  Challenge 6: Dancing with the SARs (NISAR)  ·  Team: [Team name]  · Members: [Names] 

**In one line:** Satellites know WHERE. AI knows HOW LIKELY. The sensor knows WHEN. 

## **1. The Problem** 

Every monsoon, hill slopes in Chattogram, Cox's Bazar and the Rohingya camps collapse onto homes. This is not a surprise disaster. Experts call it a **predictable monsoon hazard** : the same areas become dangerous every year. 

|**Fact**|**Number**|**Source**|
|---|---|---|
|Deaths in 4 days, July 2026 (5 districts,<br>Chattogram division)|At least 30, including 13+ Rohingya,<br>mostly children|The Star|
|Rainfall in one day, 7 July 2026|412.3 mm — highest in 43 years|Prothom Alo; BMD<br>report|
|Deaths in major landslides, 1990–2024|About 1,200|The Climate Watch|
|Families living on risky hills in<br>Chattogram city|6,558 families on 26 hills|The Daily Star|
|People in Ukhiya–Teknaf camps, built on<br>cleared hills|About 1.2 million|The Daily Star|



#### **Why the current approach is not enough** 

- **Warnings are generic.** Loudspeakers and volunteers warn whole areas, not the specific slope that is about to fail. 

- **Response is reactive.** Shelters and rescue start after the rain starts. There is no measured warning before a slope fails. 

- **No one measures the slopes.** There is no continuous monitoring of which slopes are moving or getting saturated. 

#### **The core gap** 

Two technologies exist, but each one fails on its own: 

- **Satellites (NISAR radar)** can scan every hill, even through monsoon clouds. But they pass only about every 12 days, and processed data arrives 36–72 hours later. Landslides trigger within hours of heavy rain. 

- **Ground sensors** can warn within minutes. But no one can put a sensor on every hill, and nobody knows which slopes deserve one. 

**PROBLEM STATEMENT** 

Pahar Prohori — Concept Brief  ·  1 

People living on the hill slopes of Chattogram and in the Rohingya camps receive no slopespecific warning before a landslide. Satellite data knows where the risk is but arrives too late; ground sensors are fast but cannot be placed everywhere. **How can we combine NASA's NISAR radar with low-cost ground sensing to warn the right people, on the right slope, hours before collapse?** 

## **2. Proposed Solution** 

**THE SOLUTION IN ONE SENTENCE** 

Pahar Prohori is a three-layer system: **NISAR radar** finds which slopes are unstable, an **AI model** ranks how likely each slope is to fail, and **low-cost sensors** on the riskiest slopes detect the moment failure is approaching, then sound a local siren and send Bengali alerts. 

|**Layer**|**Question**|**What we use**|**Output**|
|---|---|---|---|
|**1. Space**|WHERE is the<br>ground changing?|NISAR L-band radar: GCOV images<br>(before/after) and GUNW interferograms|Map of landslide scars and<br>slowly moving slopes|
|**2. AI**|HOW LIKELY is<br>each slope to fail?|XGBoost model trained on NASA Global<br>Landslide Catalog; inputs: GPM IMERG<br>rainfall, slope from NASADEM, NISAR<br>change. Baseline: NASA LHASA|Risk score per slope →<br>decides where sensors go|
|**3. Ground**|WHEN will it fail?|ESP32 node: soil moisture (2 depths), tilt<br>sensor, rain gauge, LoRa radio →<br>Raspberry Pi 4B gateway|Real-time alert level; siren +<br>Bengali voice/SMS|



#### **How it works, step by step** 

1. **Before monsoon:** NISAR before/after images and interferograms map old landslide scars and slowly creeping slopes. 

2. **Risk ranking:** the AI model combines this with slope steepness, rainfall history and past landslides to give every slope a risk score. 

3. **Smart placement:** sensor nodes go only on the highest-risk slopes. Satellite data decides where the hardware goes. 

4. **During rain:** GPM rainfall and live soil moisture show how saturated the slope is. The tilt sensor watches for movement. 

5. **Decision:** when two independent signals agree, the system raises the alert level. 

6. **Alert:** the siren sounds on the slope; Bengali voice/SMS goes to residents, camp managers and disaster officials; the dashboard shows the slope on the map. 

#### **Three alert levels** 

|**Level**|**When**|**Action**|
|---|---|---|
|**Watch**|Heavy rain forecast, or high accumulated rain,|Officials and volunteers alerted|
||in a high-risk zone||



Pahar Prohori — Concept Brief  ·  2 

|**Level**|**When**||**Actio**|**n**|
|---|---|---|---|---|
|**Warning**|Soil near saturation AND rai|n continuing|Resi<br>open|dents told to prepare; shelters<br>ed|
|**Evacuate**|Saturation AND rising tilt/mo<br>independent signals)|vement (two|Siren<br>now|on slope; voice + SMS: leave|
|_wo independen_<br>**Why every p**|_t signals are required before "Ev_<br>**art is essential**<br>**Satellite only**|_acuate", to keep fals_<br>**Sensor only**|_e alarms_|_low._<br>**Pahar Prohori (together)**|
|**Coverage**|Thousands of slopes|A few spots||Sees every slope + sensors in<br>the right spots|
|**Speed**|Every ~12 days, 36–72 h<br>delay|Every minute||Risk known in advance, alert in<br>real time|
|**Answers**|WHERE|WHEN||WHERE + WHEN|



_Two independent signals are required before "Evacuate", to keep false alarms low._ 

#### **Why every part is essential** 

## **3. Key Concepts in Plain Words** 

|**Term**|**Simple explanation**|
|---|---|
|**SAR**(Synthetic Aperture<br>Radar)|The satellite sends its own microwave signal and records the echo. Works day<br>or night, and through clouds.|
|**L-band**|A long radar wavelength (about 24 cm) that passes through vegetation to the<br>ground. Ideal for forested hills.|
|**NISAR**|NASA–ISRO radar satellite, launched 30 July 2025. Images almost all land<br>about every 12 days.|
|**GCOV**|NISAR's terrain-corrected radar brightness image. Comparing before/after<br>shows where the surface changed, such as a new landslide scar.|
|**GUNW**(InSAR<br>interferogram)|Compares two passes to measure ground movement of centimetres. Loss of<br>signal match (coherence) also flags sudden change.|
|**GPM IMERG**|NASA's global satellite rainfall, every 30 minutes.|
|**LHASA**|NASA's global landslide hazard model. Our baseline to beat.|
|**Global Landslide**<br>**Catalog**|NASA's record of past landslides. Training labels for the AI model.|
|**LoRa**|Long-range, low-power radio. Works kilometres away without internet or mobile<br>network.|
|**Soil saturation**|When soil pores fill with water, the soil loses strength. The main trigger of rain-<br>induced landslides.|



## **4. Data Availability (verified 24 Sep 2026)** 

We checked NASA's CMR catalog. Calibrated NISAR PROVISIONAL products cover both sites, with passes before and after the July 2026 disaster (5–11 July). 

Pahar Prohori — Concept Brief  ·  3 

|**Site**|**Track**|**Before**|**After**|**Product**|
|---|---|---|---|---|
|Chattogram city|163 descending|25 Jun|19 Jul|GCOV|
|Chattogram city|069 ascending|30 Jun|24 Jul|GCOV|
|Chattogram city|069 ascending|30 Jun|12 Jul|GUNW (interferogram)|
|Ukhiya camps|069 ascending|30 Jun|12 Jul|GCOV|
|Ukhiya camps|163 descending|7 Jul|19 Jul|GCOV|



_NISAR has a permanent data gap from 27 Jul to 10 Aug 2026. New passes continue about every 12 days after it._ 

## **5. How We Prove It Works** 

- **Backtest on July 2026:** run the model using only data available before 5 July, then compare the risk map with where landslides actually happened (news reports, NASA catalog, scars seen by NISAR). 

- **Metrics:** hit rate (share of real landslides inside high-risk zones), false-alarm area, and comparison against NASA LHASA. 

- **Sensor test:** a physical slope model in a soil tray; we measure the time between the first warning and the collapse. 

- **Honest limits:** small sample, provisional NISAR data, and vegetation can weaken the radar signal. We report these openly. 

## **6. What We Build in the Hackathon (13–14 Nov)** 

- **Must-have:** NISAR before/after scar map for July 2026; risk map from the ML model + GPM; one working sensor node with siren; dashboard showing map, live sensor data and alert level. 

- **Nice-to-have:** InSAR movement layer; Bengali voice/SMS; several nodes over LoRa. 

- **Out of scope:** mobile app, custom radar processing, field deployment. 

- **Rule:** no project code before the hackathon. Only learning, data download and buying parts. 

#### **Hardware** 

Raspberry Pi 4B (gateway + server) · ESP32 + LoRa module · 2 capacitive soil moisture sensors · MPU6050 tilt/accelerometer · rain gauge · buzzer/siren + LED · battery pack · soil tray for the slope demo 

## **7. Impact** 

- **Who benefits:** families on Chattogram's hills, over 1 million people in the camps, district disaster officials and camp managers. 

- **Scalable:** sensor nodes are low-cost and NISAR covers the whole planet, so the same method works in any monsoon hill region, such as Nepal, Northeast India, Myanmar or the Philippines. 

- **Measurable:** hours of warning before collapse, and people protected. 

## **8. Risks and Solutions** 

Pahar Prohori — Concept Brief  ·  4 

|**Risk**|**Solution**|
|---|---|
|Radar data is complex|Use NISAR's ready-made products (GCOV/GUNW); crop only our<br>area with Vertex's GDAL tool|
|Monsoon vegetation weakens<br>InSAR|Use GCOV change and coherence loss; add ESA Sentinel-1 (official<br>Space Agency Partner)|
|False alarms|Two-signal rule before "Evacuate"|
|Small validation sample|Present honestly as a case study with uncertainty|
|Sensitive topic|Public data only; no photos of victims or children|



## **9. Questions Judges May Ask** 

##### **Why not use only the satellite?** 

NISAR passes about every 12 days and its data arrives 36–72 hours later. Landslides trigger within hours. The satellite tells us where; only the sensor can tell us when. 

##### **Why not use only sensors?** 

There are thousands of hills. The satellite and AI decide which few slopes need sensors most. 

##### **Does ground-sensor warning really work?** 

Yes. It is proven in research deployments, for example Amrita University's system in Kerala, India. Our novelty is satellite-guided sensor placement and fusing all the data. 

##### **How is NASA data central?** 

NISAR decides where; GPM gives rainfall; LHASA is the baseline; the Global Landslide Catalog trains the model. Without NASA data the system cannot decide anything. 

##### **What comes next?** 

A pilot on 2–3 slopes in the 2027 monsoon with local disaster authorities and camp management. 

## **Sources** 

- The Star (AFP), 11 Jul 2026 — Rohingya deaths in Bangladesh landslides: thestar.com.my/aseanplus/aseanplusnews/2026/07/11 

- Prothom Alo English, 9 Jul 2026 — Heavy rains in Chattogram: Landslides kill 22 in three days: en.prothomalo.com/bangladesh/qljqnzojd3 

- News report citing Bangladesh Meteorological Department, 8 Jul 2026 — 412.3 mm in 24 hours: alexa.ng/2026/07/catastrophe-in-chattogram-record.html 

- The Climate Watch, 13 Jul 2026 — 120 Hills Destroyed, 1,200 Dead: theclimatewatch.com 

- The Daily Star, Jul 2026 — Danger looms over the fragile hills of Chattogram; editorial: Fatal landslides in Chattogram are man-made: thedailystar.net 

- Daily New Nation, 18 Jun 2026 — Landslide risk mounts in five hilly areas: dailynewnation.com/news/835836 

- NISAR Data User Guide — Available Data; Finding NISAR Data with Vertex: nisar-docs.asf.alaska.edu 

- NASA Earthdata — NISAR L-band data released (Jul 2026): earthdata.nasa.gov 

- NASA CMR catalog — NISAR_L2_GCOV_PROVISIONAL_V1 and NISAR_L2_GUNW_PROVISIONAL_V1 granule search, queried 24 Sep 2026: cmr.earthdata.nasa.gov 

Pahar Prohori — Concept Brief  ·  5 

