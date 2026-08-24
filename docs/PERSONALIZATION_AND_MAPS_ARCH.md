# Personalization, Proximity, and Maps Architecture

## Core Philosophy
We are moving from a generic "feed" to a highly sophisticated, hyper-personalized, location-aware matching engine tailored strictly to the OOU Ago-Iwoye campus. Our goal is to ensure customers see products that are not only relevant to their tastes but also physically closest to them, optimizing transaction speed and safety.

## 1. Proximity-Based Ranking (Location Matching)
- **Strict Location Collection:** Both businesses and customers will have strict location tags (hostels, campus gates, specific faculties).
- **Proximity Weighting:** The feed algorithm will prioritize businesses physically closer to the customer. A student at "Mini Campus" searching for food will see vendors at "Mini Campus" before vendors at "Permanent Site".

## 2. Deep Personalization & Search Tracking
- **Search History Logging:** Every search query, filter click, and category view will be logged into a new user_preferences table.
- **Click-Through Analysis:** We will track exactly which products a user clicks on from search results to build a highly accurate profile of their "taste".
- **Product-Tag Matching Engine:** We will cross-reference the customer's behavioral taste profile with the product info/tags filled out by merchants during upload.
- **Background Tailoring:** The CustomerOverview feed will be dynamically re-sorted in the background. No two customer feeds will look the same.

## 3. Localized Campus Map Integration
- **Custom OOU Map:** We will build a highly detailed, localized SVG/interactive map of the OOU Ago-Iwoye campus (including specific buildings, faculties, and popular meet-up spots like "Love Garden" or "Motion Ground").
- **New Student Onboarding:** This map will serve as a utility to help new students navigate the school quickly.
- **Safe Transaction Nodes:** We will use the map to designate specific, highly populated "Safe Zones" for meetups, deeply integrating with our Terms of Service mandate for public transactions.
- **Fulfillment Routing:** The map will help businesses and customers optimize their routes when agreeing to fulfill an order on campus.

## Future SQL Migrations Required
1. user_search_history table: (id, user_id, query, timestamp, converted_to_click).
2. user_taste_profile table: (user_id, preferred_categories, preferred_price_range).
3. campus_locations table: (id, name, coordinates, type [safe_zone, faculty, hostel]).
4. Update get_personalized_feed() Postgres RPC function to factor in ST_Distance (PostGIS) and taste overlap.
