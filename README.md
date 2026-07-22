<div align="center">

# 🌍 AirOS

### AI-Powered Urban Air Quality Operations Platform

**Transforming air quality monitoring into intelligent operational decision-making.**

AirOS is an AI-powered platform designed for Pollution Control Boards and government agencies to **monitor**, **forecast**, **understand**, **respond**, and **communicate** air quality events using explainable AI, predictive analytics, and multilingual citizen communication.

<p align="center">

<a href="https://air-os-two.vercel.app">
<img src="https://img.shields.io/badge/🚀%20Live%20Demo-AirOS-success?style=for-the-badge">
</a>

<a href="https://airos-1ypv.onrender.com/docs">
<img src="https://img.shields.io/badge/📘%20API-FastAPI-blue?style=for-the-badge">
</a>

<img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=white">

<img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white">

<img src="https://img.shields.io/badge/AI-LLM%20Powered-7B61FF?style=for-the-badge">

</p>

</div>

---

# 📖 Overview

Traditional AQI dashboards primarily display pollution values but provide limited operational support for authorities.

**AirOS transforms passive monitoring into an intelligent operational platform** capable of:

- 📡 Real-time air quality monitoring
- 🧠 AI-powered pollution source attribution
- 📈 AQI forecasting
- 🚨 Incident response coordination
- 🛡 Citizen health advisory generation
- 🌐 Multilingual AI-powered communication
- 📊 Executive reporting and decision support

Instead of simply telling users **what** the AQI is, AirOS helps authorities understand:

- Why pollution occurred
- What will happen next
- Who is most affected
- What actions should be taken
- How to communicate advisories effectively

---

# 🎯 Problem Statement

Air pollution remains one of the largest public health challenges in urban environments.

Most existing dashboards:

- Display AQI values only
- Provide limited operational intelligence
- Lack forecasting capabilities
- Offer generic citizen advisories
- Do not support multilingual communication
- Provide little assistance for incident management

AirOS bridges this gap by combining environmental intelligence with AI-powered decision support.

---

# ✨ Core Features

## 📡 Real-Time Monitoring

- Live AQI monitoring
- Multi-station support
- Weather integration
- Station search
- City-wide operational dashboard

---

## 🧠 AI Attribution Engine

AirOS analyzes environmental conditions and emission indicators to estimate the most probable pollution sources.

Supports attribution for:

- Traffic emissions
- Industrial pollution
- Construction dust
- Biomass burning
- Mixed emission scenarios

---

## 📈 AI Forecasting

Predicts future AQI trends using environmental signals.

Features:

- AQI prediction
- Severity forecasting
- Early warning generation
- Operational confidence indicators

---

## 🚨 Response Coordination

Automatically transforms pollution events into operational incidents.

Includes:

- Incident creation
- Priority assessment
- Officer assignment
- Investigation workflow
- Resolution tracking

---

## 🛡 Citizen Health Advisory

Generates structured CPCB/WHO-inspired public health recommendations.

Provides guidance for multiple population groups including:

- General Public
- Children
- Senior Citizens
- Pregnant Women
- Outdoor Workers
- People with Asthma/COPD
- Heart Disease Patients
- Sensitive Individuals
- Athletes
- School Communities

---

## 🌐 AI-Powered Multilingual Communication

AirOS supports multilingual citizen communication using a Large Language Model.

Supported languages:

- 🇬🇧 English
- 🇮🇳 Hindi
- 🇮🇳 Marathi
- 🇮🇳 Tamil
- 🇮🇳 Bengali

Features:

- Natural language translation
- Government-style communication
- Preserves severity levels
- Preserves health recommendations
- Translation caching
- Automatic English fallback
- Unicode support

---

## 📑 Reports & Decision Support

Generate operational reports including:

- Executive summaries
- Incident reports
- Health recommendations
- Forecast insights
- AI attribution summaries

---

## 🧪 Policy Simulation

Evaluate the impact of different intervention strategies before implementation.

Examples:

- Traffic restrictions
- Construction control
- Industrial emission reduction
- Emergency response measures

---

# 🚀 Live Demo

### 🌐 Frontend

https://air-os-two.vercel.app

### ⚙ Backend API

https://airos-1ypv.onrender.com

### 📘 FastAPI Documentation

https://airos-1ypv.onrender.com/docs

---

# 🏗 System Architecture

```text
                    React Frontend
                           │
                           ▼
                    FastAPI Backend
                           │
     ┌─────────────┬──────────────┬──────────────┐
     │             │              │              │
     ▼             ▼              ▼              ▼
 AQI Data     Weather Data   Attribution AI   Forecast AI
     │             │              │              │
     └─────────────┴──────────────┴──────────────┘
                           │
                           ▼
                Decision & Advisory Engine
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
 Response Coordination            Citizen Health Advisory
                                                │
                                                ▼
                                  LLM Translation Layer
                                                │
                                                ▼
                    English • Hindi • Marathi • Tamil • Bengali
```

---

# 🤖 AI Workflow

```text
Live AQI + Weather
        │
        ▼
AI Attribution
        │
        ▼
Forecast Engine
        │
        ▼
Decision Engine
        │
        ▼
Citizen Health Advisory
        │
        ▼
LLM Translation Layer
        │
        ▼
Multilingual Citizen Communication
```

---

# 🛠 Tech Stack

| Layer | Technology |
|---------|------------|
| Frontend | React, Vite |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| Language | Python |
| AI | LLM-based multilingual communication |
| Data Source | WAQI API |
| Deployment | Vercel + Render |

---

# 📂 Project Structure

```text
AirOS
│
├── agents/
│   ├── attribution_agent.py
│   ├── forecast_agent.py
│   ├── health_advisory_agent.py
│   ├── incident_agent.py
│   ├── simulation_agent.py
│   ├── notification_agent.py
│   ├── translation_agent.py
│   └── validation_agent.py
│
├── backend/
│   ├── routers/
│   ├── main.py
│   ├── pipeline.py
│   └── schemas.py
│
├── dashboard-react/
│
├── data/
│
├── requirements.txt
│
└── README.md
```

---

# 📸 Application Preview


<img width="48%" alt="image" src="https://github.com/user-attachments/assets/4af536b3-6c20-4152-9a2b-c0e557127389" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/0b3b8cda-342e-4f4e-abef-05515f084d4b" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/efe78e52-9aab-42d5-b109-ebd1f53dab86" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/56037739-7195-4b77-8748-c28119052c67" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/275db5ff-8b17-4cfb-a5dd-b7d98537e070" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/ce9e6c16-aa1e-48e6-afcb-6ff49fe213cc" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/89635ba9-c63f-4f65-8e76-e46b787bc333" />
<img width="48%" alt="image" src="https://github.com/user-attachments/assets/7f060ff6-4155-4b1b-8d5c-840381b90c42" />











---

# 🌱 Future Roadmap

- Satellite imagery integration
- IoT sensor expansion
- Mobile application
- Voice-based multilingual advisories
- Emergency broadcast integration
- Drone-assisted monitoring
- Real-time sensor fusion
- Predictive intervention planning

---

# 💡 Key Highlights

✅ Real-time AQI Monitoring

✅ AI Pollution Attribution

✅ AQI Forecasting

✅ Response Coordination

✅ Incident Management

✅ Policy Simulation

✅ AI-powered Multilingual Communication

✅ Decision Support

✅ Government-style Citizen Advisories

---


# 📜 License

This project is intended for educational, research, and hackathon purposes.
