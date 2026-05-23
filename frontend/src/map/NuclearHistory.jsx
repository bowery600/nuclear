import { useState, useMemo, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Clock, 
  Search, 
  X, 
  Award, 
  ShieldAlert, 
  Zap, 
  Layers, 
  Bookmark, 
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Building2,
  Cpu
} from "lucide-react";

// Academic Sources & Bibliography database
const BIBLIOGRAPHY = [
  { id: 1, text: "Henri Becquerel, 'Sur les radiations émises par phosphorescence,' Comptes Rendus de l'Académie des Sciences, 1896." },
  { id: 2, text: "Marie Curie & Pierre Curie, 'Sur une substance nouvelle radio-active, contenue dans la pechblende,' Comptes Rendus, 1898." },
  { id: 3, text: "Ernest Rutherford, 'The Scattering of α and β Particles by Matter and the Structure of the Atom,' Philosophical Magazine, 1911." },
  { id: 4, text: "James Chadwick, 'Possible Existence of a Neutron,' Nature, 1932." },
  { id: 5, text: "Otto Hahn & Fritz Strassmann, 'Über den Nachweis und das Verhalten der bei der Bestrahlung des Urans mittels Neutronen entstehenden Erdalkalimetalle,' Naturwissenschaften, 1939." },
  { id: 6, text: "Lise Meitner & Otto Frisch, 'Disintegration of Uranium by Neutrons: a New Type of Nuclear Reaction,' Nature, 1939." },
  { id: 7, text: "Leo Szilard, British Patent No. 630,726, 'Improvements in or relating to the Transmutation of Chemical Elements,' applied 1934, issued 1949." },
  { id: 8, text: "Albert Einstein & Leo Szilard, 'Einstein-Szilard Letter to President Franklin D. Roosevelt,' August 2, 1939." },
  { id: 9, text: "Enrico Fermi, 'Experimental Production of a Self-Sustaining Nuclear Chain Reaction,' Physical Review, 1946." },
  { id: 10, text: "Richard G. Hewlett & Oscar E. Anderson, 'The New World, 1939/1946: A History of the United States Atomic Energy Commission,' Penn State University Press, 1962." },
  { id: 11, text: "Michele S. Gerber, 'On the Home Front: The Cold War Legacy of the Hanford Site,' University of Nebraska Press, 2002." },
  { id: 12, text: "F. G. Gosling, 'The Manhattan Project: Making the Atomic Bomb,' U.S. Department of Energy, 1999." },
  { id: 13, text: "Manhattan Engineer District, 'Trinity,' U.S. Department of Energy Historical Reports, 1945." },
  { id: 14, text: "U.S. Department of Energy, 'Experimental Breeder Reactor I,' National Historic Landmark Program, Office of Nuclear Energy." },
  { id: 15, text: "Dwight D. Eisenhower, 'Atoms for Peace Address to the United Nations General Assembly,' December 8, 1953." },
  { id: 16, text: "International Atomic Energy Agency, 'Obninsk: The World's First Grid-Connected Nuclear Power Station,' IAEA Bulletin, Vol. 46, 2004." },
  { id: 17, text: "UK Atomic Energy Authority, 'Calder Hall: The Birth of Industrial Nuclear Power,' HMSO, 1956." },
  { id: 18, text: "Westinghouse Electric Corporation, 'The Shippingport Pressurized Water Reactor,' Addison-Wesley Publishing, 1958." },
  { id: 19, text: "International Atomic Energy Agency, 'Statute of the IAEA,' IAEA, Vienna, 1957." },
  { id: 20, text: "Irvin C. Bupp & Jean-Claude Derian, 'Light Water: How the Nuclear Dream Dissolved,' Basic Books, 1978." },
  { id: 21, text: "Atomic Energy of Canada Limited, 'CANDU Reactor Systems: Design and Development,' AECL, 1990." },
  { id: 22, text: "UK Office for Nuclear Regulation, 'History and Development of UK Nuclear Power Reactors,' ONR Report, 2012." },
  { id: 23, text: "World Nuclear Association, 'Nuclear Power in the World Today,' Historical Capacity & Reactor Growth Statistics." },
  { id: 24, text: "President's Commission on the Accident at Three Mile Island (Kemeny Commission), 'The Need for Change: The Legacy of TMI,' Washington D.C., 1979." },
  { id: 25, text: "U.S. Nuclear Regulatory Commission, 'Backgrounder on the Three Mile Island Accident,' NRC Office of Public Affairs, 2018." },
  { id: 26, text: "International Nuclear Safety Advisory Group, 'The Chernobyl Accident: Updating INSAG-1 (INSAG-7),' IAEA Safety Series, Vienna, 1992." },
  { id: 27, text: "World Association of Nuclear Operators, 'WANO: 30 Years of Global Nuclear Safety Cooperation,' London, 2019." },
  { id: 28, text: "Bernard L. Cohen, 'The Nuclear Energy Option: An Alternative for the 90s,' Plenum Press, 1990." },
  { id: 29, text: "U.S. Congress, 'Energy Policy Act of 2005,' Public Law 109-58, 2005." },
  { id: 30, text: "Nuclear Energy Agency (OECD), 'Technology Roadmap for Generation IV Nuclear Energy Systems,' OECD/NEA, 2002." },
  { id: 31, text: "International Atomic Energy Agency, 'The Fukushima Daiichi Accident: Report by the Director General,' IAEA, Vienna, 2015." },
  { id: 32, text: "German Federal Ministry for Economic Affairs and Climate Action, 'Germany's Nuclear Phase-Out and the Energy Transition (Energiewende),' BMWK, 2021." },
  { id: 33, text: "Western European Nuclear Regulators Association (WENRA), 'Post-Fukushima Stress Tests and Safety Retrofits,' WENRA Report, 2013." },
  { id: 34, text: "Intergovernmental Panel on Climate Change (IPCC), 'Global Warming of 1.5°C: Summary for Policymakers,' IPCC Special Report, 2018." },
  { id: 35, text: "U.S. Department of Energy, 'Small Modular Reactors: Market Analyses and Technical Readiness,' Office of Nuclear Energy, 2020." },
  { id: 36, text: "Generation IV International Forum (GIF), 'Annual Report on Gen IV Reactor Systems,' GIF/OECD, 2022." },
  { id: 37, text: "Electric Power Research Institute (EPRI), 'Technical Basis for Subsequent License Renewal (SLR) to 80 Years,' EPRI Report, 2020." }
];

const TRIVIA_FACTS = [
  "Did you know? On December 20, 1951, the Experimental Breeder Reactor I (EBR-I) in Idaho generated the first electricity from atomic energy, originally powering just four 200-watt light bulbs.",
  "Obninsk Nuclear Power Plant, connected in June 1954 in the USSR, was the first grid-connected civilian nuclear power station, operating with an output of just 5 Megawatts.",
  "Marie Curie remains the only person to receive Nobel Prizes in two different scientific fields: Physics in 1903 (shared with Pierre Curie and Henri Becquerel) and Chemistry in 1911.",
  "Chicago Pile-1 (CP-1), the world's first artificial nuclear reactor, was constructed under a football grandstand at the University of Chicago and had no radiation shielding or cooling system.",
  "Finland's Onkalo repository, currently nearing operations, will be the world's first deep geological repository for spent nuclear fuel, designed to safely isolate waste for 100,000 years."
];

// Chronological Eras
const ERAS_DATA = [
  {
    id: "era-1",
    title: "The Dawn of Nuclear Physics",
    years: "1896 – 1939",
    summary: "The fundamental discoveries of radiation, atomic structure, and nuclear fission that opened the atomic age.",
    icon: Award,
    content: `The journey of nuclear energy began in **1896** when French physicist **Henri Becquerel** discovered that uranium salts emitted an invisible, spontaneous radiation that could expose photographic plates [1]. Shortly after, **Marie and Pierre Curie** embarked on systematic research, coining the term *"radioactivity"* and successfully isolating two highly radioactive new elements: polonium and radium [2]. Their pioneering work established that radioactivity was an atomic property rather than a chemical reaction.
    
    In **1911**, **Ernest Rutherford** revolutionized physics by proposing the nuclear atom, demonstrating that mass and positive charge were concentrated in a tiny central nucleus [3]. This was followed in **1932** by **James Chadwick's** discovery of the **neutron** [4], an uncharged subatomic particle. Because neutrons carry no electrostatic repulsion, they became the ultimate projectile for penetrating heavy atomic nuclei.
    
    The critical breakthrough came in **December 1938** in Berlin. Chemists **Otto Hahn** and **Fritz Strassmann** bombarded uranium with neutrons and detected barium among the byproducts—an result that baffled them [5]. They sent their findings to Austrian-Swedish physicist **Lise Meitner**, then in exile in Sweden, who, alongside her nephew **Otto Frisch**, calculated that the uranium nucleus had actually split into lighter elements. They named the process *"nuclear fission"* and calculated that it released a staggering 200 MeV of energy per nucleus split, in perfect accordance with Einstein's E=mc² [6].
    
    Recognizing the colossal energy potential, Hungarian physicist **Leo Szilard** patented the concept of a neutron-induced **nuclear chain reaction** [7]. As World War II loomed, Szilard co-drafted the famous **Einstein-Szilard letter** in August 1939 to U.S. President Franklin D. Roosevelt, warning that Nazi Germany might exploit nuclear fission to build an extraordinarily powerful weapon, setting the wheels of government research in motion [8].`
  },
  {
    id: "era-2",
    title: "The Manhattan Project & Weaponization",
    years: "1939 – 1945",
    summary: "The intense, highly secretive wartime race to achieve a self-sustaining chain reaction and design atomic weapons.",
    icon: ShieldAlert,
    content: `With the outbreak of World War II, the United States launched the **Manhattan Project**—a massive, highly classified industrial and scientific collaboration to build the atomic bomb. The initial crucial hurdle was proving that a controlled nuclear chain reaction was physically possible.
    
    On **December 2, 1942**, beneath the west grandstands of Stagg Field at the University of Chicago, a team led by Italian physicist **Enrico Fermi** achieved the first artificial, self-sustaining controlled nuclear chain reaction [9]. The reactor, known as **Chicago Pile-1 (CP-1)**, was constructed of graphite blocks containing natural uranium. Cadmium rods were adjusted manually to control the rate of fission. This milestone proved that humankind could harness the force of the atomic nucleus.
    
    Following Fermi's success, the project scaled up to industrial proportions. Massive enrichment plants were built in **Oak Ridge, Tennessee**, using electromagnetic separation and gaseous diffusion to isolate the fissionable isotope Uranium-235 from abundant Uranium-238 [10]. Simultaneously, the world's first production-scale reactors, including the famous water-cooled graphite **B-Reactor**, were erected at **Hanford, Washington** to synthesize Plutonium-239 via neutron capture in uranium [11].
    
    Under the scientific direction of **J. Robert Oppenheimer** at the isolated laboratory in **Los Alamos, New Mexico**, these fissile materials were engineered into complex weapons [12]. On **July 16, 1945**, the first nuclear explosion was detonated at the **Trinity Test** site near Alamogordo, New Mexico, ushering in the nuclear age with a flash brighter than a dozen suns [13]. Less than a month later, atomic bombs were dropped on Hiroshima and Nagasaki, leading to the end of WWII and highlighting the immense, dual-edged sword of nuclear technology.`
  },
  {
    id: "era-3",
    title: "\"Atoms for Peace\" & Early Power Reactors",
    years: "1945 – 1960s",
    summary: "Transitioning wartime weapons technology into clean, civilian energy grids and international safety framework creation.",
    icon: Zap,
    content: `Following the devastation of World War II, scientists and policymakers sought to redirect the energy of the atom toward constructive, civilian applications. On **December 20, 1951**, the **Experimental Breeder Reactor I (EBR-I)** in Arco, Idaho, generated the world's first electricity from nuclear fission, lighting four simple 200-watt lightbulbs [14].
    
    In **December 1953**, U.S. President Dwight D. Eisenhower delivered his historic **\"Atoms for Peace\"** address to the United Nations General Assembly. He proposed that nuclear materials and technology be shared internationally under safety safeguards to provide energy, medicine, and agricultural benefits [15]. This vision led directly to the founding of the **International Atomic Energy Agency (IAEA)** in **1957** to promote safe, secure, and peaceful nuclear technology while preventing weapon proliferation [19].
    
    Commercial nuclear electricity rapidly became a reality on both sides of the Iron Curtain. In **June 1954**, the Soviet Union connected the **Obninsk Nuclear Power Plant (AM-1)** to the electric grid, producing 5 Megawatts of electrical power and marking the first grid-connected power station [16]. In **1956**, the United Kingdom opened **Calder Hall** in Cumbria, the first industrial-scale nuclear station, producing 50 MW of power (while simultaneously producing military-grade plutonium) [17].
    
    The United States crossed the threshold of pure commercial, non-military nuclear energy in **December 1957** with the startup of the **Shippingport Atomic Power Station** in Pennsylvania [18]. Utilizing a **Pressurized Water Reactor (PWR)** designed by Admiral Hyman Rickover's naval propulsion team and built by Westinghouse, Shippingport set the technological blueprint for the global commercial fleet, proving that nuclear power could compete directly with fossil fuels on grid stability.`
  },
  {
    id: "era-4",
    title: "The Golden Age of Commercial Expansion",
    years: "1960s – 1979",
    summary: "A period of rapid growth, scaling up of unit capacities, and global construction of light water reactors.",
    icon: Layers,
    content: `The 1960s and 1970s marked the **\"Golden Age\"** of nuclear expansion. Utilities worldwide began ordering nuclear power plants in massive quantities. Reactor vendors like Westinghouse, General Electric, and Combustion Engineering pioneered the **\"Turnkey\"** era, offering complete, fixed-price nuclear units to entice regional utilities [20].
    
    Technological standards coalesced around two primary designs: **Pressurized Water Reactors (PWRs)**, which keep water under high pressure to prevent boiling in the primary cooling loop, and **Boiling Water Reactors (BWRs)**, which boil water directly in the reactor core to drive the steam turbine. Outside the U.S., other distinctive national designs emerged, notably Canada's pressurized heavy-water **CANDU reactor** (which uses natural, unenriched uranium and heavy water as a moderator) [21], and the UK's advanced gas-cooled reactors (AGRs) [22].
    
    Unit capacities scaled up exponentially. Early demonstration plants of 200 Megawatts were rapidly replaced by massive gigawatt-scale units (1,000 to 1,200 MW per reactor). Projections in the early 1970s by agencies like the U.S. Atomic Energy Commission (AEC) suggested that thousands of reactors would be operational by the year 2000, promising electricity that would be \"too cheap to meter\" (a quote originally referring to fusion but associated with fission expansion) [23].
    
    Nuclear power represented progress, industrial high technology, and an escape route from the fossil-fuel vulnerabilities highlighted by the **1973 OPEC oil crisis**. Across Western Europe, Japan, and North America, massive civil engineering projects broke ground, reshaping national energy balances.`
  },
  {
    id: "era-5",
    title: "Three Mile Island, Chernobyl, & Public Backlash",
    years: "1979 – 1990s",
    summary: "The pivotal safety accidents that caused deep public anxiety, regulatory overhauls, and construction stagnation.",
    icon: AlertTriangle,
    content: `The rapid rise of nuclear energy was abruptly checked by two major accidents that permanently altered public perception, economics, and regulatory frameworks worldwide.
    
    On **March 28, 1979**, Unit 2 of the **Three Mile Island (TMI-2)** plant near Harrisburg, Pennsylvania, suffered a partial meltdown [24]. The accident was initiated by a relatively minor mechanical failure in the feed-water system, which escalated when a pilot-operated relief valve (PORV) stuck open, allowing coolant to escape. Due to confusing control room indicators and inadequate training, operators turned off emergency water pumps, causing the core to overheat and melt.
    
    Although TMI's robust **defense-in-depth steel and concrete containment dome** successfully prevented any significant radiation releases to the public, the psychological impact was massive. The accident triggered an overhaul of U.S. regulations, leading to the creation of the **Institute of Nuclear Power Operations (INPO)** to enforce high-performance standards, and forced reactor designs to adopt stricter human-factor control rooms [25].
    
    A far more severe catastrophe struck on **April 26, 1986**, at the **Chernobyl Nuclear Power Plant** in Ukraine (USSR) [26]. During a poorly planned safety test on Unit 4, operators disabled safety systems and pushed the reactor into an unstable, low-power state. The reactor, a Soviet-designed graphite-moderated **RBMK-1000**, possessed a severe design flaw known as a positive void coefficient, meaning that steam bubbles increased the nuclear reaction rate. When emergency shutdown was triggered, the graphite-tipped control rods caused a localized power surge, resulting in prompt-critical energy excursion, steam explosions, and a massive graphite fire.
    
    Lacking any concrete containment structure, the burning core spewed highly radioactive isotopes into the atmosphere for ten days, contaminating vast swathes of Ukraine, Belarus, Russia, and Europe. Chernobyl led to 31 direct deaths, thousands of pediatric thyroid cancers, and the relocation of over 100,000 residents from a 30-kilometer exclusion zone. In response, the global community strengthened the IAEA and founded the **World Association of Nuclear Operators (WANO)** to ensure that a safety culture transcended geopolitical boundaries [27].
    
    Following these accidents, public opposition soared, borrowing costs escalated, and safety requirements became more complex. Hundreds of reactor orders in the West were canceled, leading to a long period of stagnation [28].`
  },
  {
    id: "era-6",
    title: "The Nuclear Renaissance & Fukushima",
    years: "2000s – 2011",
    summary: "A carbon-free energy resurgence followed by the natural disaster that forced safety re-evaluations.",
    icon: ShieldAlert,
    content: `By the early 2000s, the nuclear sector experienced a modest revival known as the **\"Nuclear Renaissance.\"** Rapidly growing concerns over climate change, carbon emissions, and electricity grid security led policymakers to re-examine nuclear power as a vital source of zero-carbon baseload electricity. The U.S. Energy Policy Act of 2005 provided loan guarantees and tax credits for new reactors [29], and vendors marketed advanced **Generation III/III+ designs** (such as the Westinghouse AP1000 and Framatome EPR) featuring simplified piping and **passive safety systems** that rely on gravity and natural circulation rather than active pumps [30].
    
    However, this momentum was shattered on **March 11, 2011**, by the **Fukushima Daiichi accident** in Japan [31]. A colossal magnitude 9.0 Tohoku earthquake struck off Japan's coast, automatically shutting down the active reactors at Fukushima. However, 41 minutes later, a massive 14-meter tsunami overtopped the plant's poorly designed 5.7-meter sea wall, flooding the basement turbine buildings where the emergency diesel generators and DC batteries were located.
    
    With all electricity cut off—a state known as a **Station Blackout (SBO)**—the coolant pumps failed. Over the next several days, the cores of Units 1, 2, and 3 melted. The zirconium cladding on the fuel reacted with steam at high temperatures, producing highly explosive hydrogen gas that accumulated and blew apart the secondary containment buildings of Units 1, 3, and 4.
    
    Fukushima led to significant radioactive releases, forcing the evacuation of over 150,000 people. Although there were no direct radiation deaths from the accident, the evacuation itself and associated stress caused substantial disruption. Internationally, the fallout was swift: Germany immediately shuttered its oldest reactors and initiated a complete phase-out (*Energiewende*) [32], while regulators worldwide mandated \"stress tests\" and required all operating plants to acquire **FLEX equipment**—portable emergency pumps and generators stored in hardened bunkers to cope with extreme, multi-hazard natural events [33].`
  },
  {
    id: "era-7",
    title: "The Modern Horizon & Deep Decarbonization",
    years: "2012 – Present",
    summary: "Advanced reactors, Small Modular Reactors (SMRs), and nuclear's crucial role in achieving net-zero emissions.",
    icon: BookOpen,
    content: `Today, nuclear power stands at a critical juncture in the global fight against climate change. The Intergovernmental Panel on Climate Change (IPCC) and international energy agencies emphasize that meeting net-zero carbon targets requires a substantial expansion of dispatchable, zero-emission baseload electricity to back up intermittent wind and solar resources [34].
    
    A major paradigm shift is underway from giant, custom-built gigawatt plants toward **Small Modular Reactors (SMRs)** [35]. Typically producing under 300 Megawatts, SMRs are designed to be factory-fabricated, shipped by rail or barge, and assembled incrementally on-site. This approach aims to drastically reduce up-front capital costs, shorten construction times, and enable reactors to replace retiring coal units by reusing existing grid and cooling water infrastructure.
    
    Beyond traditional light-water SMRs, scientists are developing **Generation IV advanced reactors** [36]. These reactors employ alternative coolants and moderators, operating at extremely high temperatures for industrial processes (hydrogen synthesis, desalinization) and featuring **inherent safety**—meaning the physical properties of the fuel and coolant naturally shut down the fission reaction without human or mechanical intervention if temperatures rise. Key concepts include:
    - **High-Temperature Gas-Cooled Reactors (HTGR)** using helium gas coolant and TRISO fuel pebbles that cannot melt under any operational temperature.
    - **Liquid Metal Fast Reactors** cooled by sodium or lead, which operate at atmospheric pressure and can \"breed\" their own fuel or incinerate long-lived nuclear waste.
    - **Molten Salt Reactors (MSRs)** where the nuclear fuel is dissolved directly in a liquid salt mixture, eliminating the risk of a core meltdown because the fuel is already molten.
    
    Simultaneously, existing operators are pursuing **Subsequent License Renewals (SLR)**, securing regulatory approval to safely operate robust, depreciated plants for 60 to 80 years [37]. This extension represents the most cost-effective source of carbon-free baseload energy available, ensuring that the legacy nuclear fleet continues to stabilize the high-tech, deeply decarbonized grids of the 21st century.`
  }
];

// Pioneering Facilities
const PIONEERS = [
  {
    name: "Chicago Pile-1 (CP-1)",
    location: "Chicago, Illinois, USA",
    year: "December 2, 1942",
    details: "The birthplace of nuclear fission technology. Led by Enrico Fermi, this experimental assembly of 400 tons of graphite and 50 tons of uranium achieved the first self-sustaining controlled nuclear chain reaction.",
    achievement: "First artificial self-sustaining nuclear chain reaction [9].",
    image: "chicago_pile"
  },
  {
    name: "EBR-I (Experimental Breeder Reactor I)",
    location: "Arco, Idaho, USA",
    year: "December 20, 1951",
    details: "An experimental liquid-metal (NaK) cooled fast reactor designed to test breeding plutonium from uranium. EBR-I became the first nuclear reactor in history to generate electricity, lighting four 200W bulbs.",
    achievement: "First production of electricity from atomic energy [14].",
    image: "ebr_one"
  },
  {
    name: "Obninsk Nuclear Power Plant (AM-1)",
    location: "Obninsk, Kaluga Oblast, USSR",
    year: "June 27, 1954",
    details: "Developed as the 'Peaceful Atom' (Atom Mirny), AM-1 was a graphite-moderated, water-cooled channel reactor. With an output of 5 MWe, it successfully fed electricity into the Soviet power grid for 48 years.",
    achievement: "World's first grid-connected civilian nuclear power station [16].",
    image: "obninsk_plant"
  },
  {
    name: "Calder Hall Power Station",
    location: "Cumbria, United Kingdom",
    year: "August 27, 1956",
    details: "The world's first industrial-scale power station, utilizing four Magnox carbon-dioxide gas-cooled, graphite-moderated reactors. It supplied electricity to the British grid while also manufacturing weapon plutonium.",
    achievement: "First industrial-scale electricity generation plant [17].",
    image: "calder_hall"
  },
  {
    name: "Shippingport Atomic Power Station",
    location: "Shippingport, Pennsylvania, USA",
    year: "December 18, 1957",
    details: "Designed as a strictly non-military reactor, Shippingport was a Pressurized Water Reactor (PWR) rated at 60 MWe. It established the light-water PWR design as the preeminent global standard for commercial power.",
    achievement: "First full-scale commercial nuclear plant in the United States [18].",
    image: "shippingport"
  }
];

// Incidents & Safety Retrofits
const INCIDENTS = [
  {
    name: "Three Mile Island (Unit 2 Meltdown)",
    date: "March 28, 1979",
    location: "Middletown, Pennsylvania, USA",
    level: "INES Level 5 (Accident with Wider Consequences)",
    cause: "A mechanical failure in the secondary condensate pumps caused steam generators to stop removing heat. A pilot-operated relief valve (PORV) stuck open, allowing coolant to escape. Misleading control room indicators led operators to restrict high-pressure emergency injection water, causing the core to overheat and partially melt.",
    outcomes: "No direct deaths, injuries, or long-term health consequences occurred due to robust containment structures. However, it severely damaged public trust, bankrupted the utility, and prompted sweeping regulatory changes. Human-factors engineering in control rooms was standardized, and the Institute of Nuclear Power Operations (INPO) was formed to self-regulate safety [24, 25].",
    lessons: "Defense-in-depth works. Standardized human-machine interfaces, safety parameter displays, and absolute emphasis on emergency core cooling monitoring."
  },
  {
    name: "Chernobyl Disaster (Unit 4 Explosion)",
    date: "April 26, 1986",
    location: "Pripyat, Ukrainian SSR, Soviet Union",
    level: "INES Level 7 (Major Accident)",
    cause: "During a low-power safety test on a graphite-moderated RBMK-1000 reactor, operators bypassed multiple safety interlocks. Severe design flaws—including a positive void coefficient (steam pockets accelerate fission) and graphite-tipped control rods that briefly increased power upon insertion—triggered a rapid, uncontrolled power excursion. Thermal-steam explosions blew off the 2,000-ton reactor lid and shattered the core, exposing the burning graphite moderator to the atmosphere.",
    outcomes: "31 immediate deaths from acute radiation sickness, an estimated 4,000–6,000 cases of thyroid cancer among children, and radioactive contamination across Europe. A 30-km Exclusion Zone remains in place. This disaster triggered massive geopolitical cooperation, forced Soviet reactor design retrofits, and led to the creation of the World Association of Nuclear Operators (WANO) to share safety protocols [26, 27].",
    lessons: "Positive void coefficients are inherently unsafe and banned. Concrete secondary containments are mandatory for all reactors. Safety culture must override scheduling pressure."
  },
  {
    name: "Fukushima Daiichi Disaster (Units 1–3 Meltdowns)",
    date: "March 11, 2011",
    location: "Okuma, Fukushima Prefecture, Japan",
    level: "INES Level 7 (Major Accident)",
    cause: "A massive magnitude 9.0 Tohoku earthquake shook the plant, triggering an immediate shutdown. 41 minutes later, a 14-meter tsunami overtopped the plant's 5.7-meter sea defenses, completely flooding the basement rooms housing the emergency diesel generators and backup batteries. This caused a complete Station Blackout (SBO), disabling all active cooling systems. The water boiled away, leading to core meltdowns in Units 1–3. Extremely hot steam reacted with the fuel cladding, creating hydrogen gas that leaked and exploded, destroying the outer containment buildings.",
    outcomes: "No immediate radiation deaths occurred. However, the mass evacuation of over 150,000 residents caused significant social disruption and stress-related casualties. Large quantities of contaminated water had to be treated and stored. Fukushima triggered Germany's accelerated phase-out and led to global stress-testing of coastal reactors [31, 32].",
    lessons: "Extreme natural multi-hazards (earthquakes + tsunamis) must be designed for. Emergency power must be waterproofed. Hardened containment venting systems and portable emergency equipment (FLEX pumps) must be pre-staged."
  }
];

// Fuel Cycle & Waste Management
const FUEL_CYCLE_SECTIONS = [
  {
    title: "The Front-End: From Ore to Fuel Assembly",
    content: "The front-end of the nuclear fuel cycle comprises mining, milling, conversion, enrichment, and fuel fabrication. Uranium ore is mined (often via in-situ leaching) and milled into 'yellowcake' (U3O8). Because commercial reactors require the fissile isotope Uranium-235 (which constitutes only 0.7% of natural uranium), the yellowcake is converted into Uranium Hexafluoride (UF6) gas and enriched to 3% to 5% U-235 using high-speed gas centrifuges. Finally, the enriched gas is converted into solid uranium dioxide ceramic pellets, which are loaded into corrosion-resistant zirconium alloy tubes to form fuel rods. These rods are grouped into fuel assemblies to be loaded into the reactor core [23, 35]."
  },
  {
    title: "The Back-End: Spent Fuel Management",
    content: "After three to six years of generating electricity, fuel assemblies become depleted ('spent') and are removed from the core. Spent fuel is highly radioactive and thermally hot. It is initially submerged in deep, steel-lined concrete 'spent fuel pools' for at least five years to cool. Once the heat declines, the fuel is transferred into robust steel-and-concrete 'dry storage casks' stored on concrete pads [37]. These casks are designed to withstand earthquakes, plane crashes, and projectile impacts, providing safe temporary storage for decades."
  },
  {
    title: "Reprocessing vs. Once-Through Cycle",
    content: "Countries handle spent fuel using two main strategies: the 'Once-Through' open cycle or the closed cycle via reprocessing. The U.S. utilizes the once-through cycle, treating spent fuel directly as waste destined for permanent disposal. France, Japan, and Russia utilize reprocessing, chemically separating unused uranium and plutonium from fission products. This recovered fuel is manufactured into Mixed Oxide (MOX) fuel to be burned in reactors again, reducing high-level waste volume by up to 75% and extracting more energy from the original ore [28, 36]."
  },
  {
    title: "Deep Geological Repositories (DGR)",
    content: "The ultimate consensus for permanent disposal of high-level waste is deep geological repositories—locating engineered containment tunnels hundreds of meters deep in stable rock formations. Finland is leading the world with the **Onkalo repository**, carved into ancient granitic bedrock 450 meters underground. Spent fuel will be packed in corrosion-resistant copper canisters, surrounded by bentonite clay, and sealed forever. This multi-barrier system is designed to isolate nuclear waste from the biosphere for over 100,000 years, requiring no active maintenance or security [34]."
  }
];

export default function NuclearHistory({ onClose }) {
  const [activeTab, setActiveTab] = useState("eras"); // "eras" | "pioneers" | "incidents" | "fuel" | "sources"
  const [selectedEraId, setSelectedEraId] = useState("era-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTrivia, setCurrentTrivia] = useState(0);
  const [hoveredCitation, setHoveredCitation] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const bibliographyRef = useRef(null);

  // Rotate trivia facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTrivia((prev) => (prev + 1) % TRIVIA_FACTS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const activeEra = useMemo(() => {
    return ERAS_DATA.find((era) => era.id === selectedEraId) || ERAS_DATA[0];
  }, [selectedEraId]);

  // Unified history search engine
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    
    const erasMatch = ERAS_DATA.filter(
      (era) => era.title.toLowerCase().includes(q) || era.content.toLowerCase().includes(q) || era.summary.toLowerCase().includes(q)
    );

    const pioneersMatch = PIONEERS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.details.toLowerCase().includes(q) || p.achievement.toLowerCase().includes(q)
    );

    const incidentsMatch = INCIDENTS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.cause.toLowerCase().includes(q) || i.outcomes.toLowerCase().includes(q) || i.lessons.toLowerCase().includes(q)
    );

    const fuelMatch = FUEL_CYCLE_SECTIONS.filter(
      (f) => f.title.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
    );

    return {
      eras: erasMatch,
      pioneers: pioneersMatch,
      incidents: incidentsMatch,
      fuel: fuelMatch,
      total: erasMatch.length + pioneersMatch.length + incidentsMatch.length + fuelMatch.length
    };
  }, [searchQuery]);

  const handleFootnoteClick = (citationNumber) => {
    setActiveTab("sources");
    setTimeout(() => {
      const element = document.getElementById(`citation-${citationNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("highlighted-citation");
        setTimeout(() => {
          element.classList.remove("highlighted-citation");
        }, 3000);
      }
    }, 100);
  };

  const handleFootnoteHover = (e, citationNumber) => {
    const rect = e.target.getBoundingClientRect();
    const sourceText = BIBLIOGRAPHY.find(s => s.id === citationNumber)?.text || "Source citation";
    setHoveredCitation({ number: citationNumber, text: sourceText });
    setTooltipPos({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 10
    });
  };

  // Convert raw Markdown bolding **text** and superscripts [number] into React elements with citations
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    // Split by footnotes e.g. [12] or [24, 25]
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    
    return parts.map((part, index) => {
      // Check if this part is a footnote
      const isFootnote = /^\[\d+(?:,\s*\d+)*\]$/.test(part);
      
      if (isFootnote) {
        // Extract numbers
        const numbers = part.slice(1, -1).split(",").map(n => parseInt(n.trim(), 10));
        
        return (
          <span key={index} className="footnote-container">
            {numbers.map((num, i) => (
              <sup 
                key={num} 
                className="citation-superscript"
                onClick={() => handleFootnoteClick(num)}
                onMouseEnter={(e) => handleFootnoteHover(e, num)}
                onMouseLeave={() => setHoveredCitation(null)}
              >
                {i > 0 && ", "}[{num}]
              </sup>
            ))}
          </span>
        );
      }

      // Convert standard markdown **bolding** into <strong>
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, bIdx) => {
        if (/^\*\*[^*]+\*\*$/.test(bp)) {
          return <strong key={bIdx}>{bp.slice(2, -2)}</strong>;
        }
        return bp;
      });
    });
  };

  return (
    <div className="history-overlay">
      <div className="history-container">
        
        {/* Header Block */}
        <header className="history-header">
          <div className="header-left">
            <div className="brand-badge">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="eyebrow">NUC.OWN Archives</p>
              <h2>Nuclear Power History & Science</h2>
            </div>
          </div>

          <div className="header-right">
            {/* Search box */}
            <div className="history-search-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search history, facilities, reactors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <button className="close-history-btn" onClick={onClose}>
              <ArrowLeft size={16} />
              <span>Back to Live Grid</span>
            </button>
          </div>
        </header>

        {/* Dynamic Trivia Banner */}
        <div className="trivia-banner">
          <div className="trivia-badge">
            <Lightbulb size={14} className="trivia-icon animate-pulse" />
            <span>DID YOU KNOW?</span>
          </div>
          <div className="trivia-content">
            <p>{TRIVIA_FACTS[currentTrivia]}</p>
          </div>
        </div>

        {/* Search Results Dashboard */}
        {searchQuery.trim() ? (
          <div className="search-dashboard-view">
            <div className="search-results-summary">
              <h3>Search Results for: <span className="query-highlight">"{searchQuery}"</span></h3>
              <p>{searchResults?.total || 0} matches found across database archives.</p>
              <button className="reset-search-link" onClick={() => setSearchQuery("")}>Clear Search</button>
            </div>

            <div className="search-results-grid">
              
              {/* Eras Results */}
              {searchResults?.eras.length > 0 && (
                <section className="results-group">
                  <h4><Calendar size={15} /> Historical Eras ({searchResults.eras.length})</h4>
                  <div className="results-list">
                    {searchResults.eras.map(era => (
                      <article key={era.id} className="search-result-card" onClick={() => { setActiveTab("eras"); setSelectedEraId(era.id); setSearchQuery(""); }}>
                        <h5>{era.title} <span className="era-years">{era.years}</span></h5>
                        <p>{era.summary}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Pioneers Results */}
              {searchResults?.pioneers.length > 0 && (
                <section className="results-group">
                  <h4><Building2 size={15} /> Pioneering Milestones ({searchResults.pioneers.length})</h4>
                  <div className="results-list">
                    {searchResults.pioneers.map((p, idx) => (
                      <article key={idx} className="search-result-card" onClick={() => { setActiveTab("pioneers"); setSearchQuery(""); }}>
                        <h5>{p.name} <span className="era-years">{p.year}</span></h5>
                        <p>{p.details}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Incidents Results */}
              {searchResults?.incidents.length > 0 && (
                <section className="results-group">
                  <h4><AlertTriangle size={15} /> Safety & Incidents ({searchResults.incidents.length})</h4>
                  <div className="results-list">
                    {searchResults.incidents.map((i, idx) => (
                      <article key={idx} className="search-result-card" onClick={() => { setActiveTab("incidents"); setSearchQuery(""); }}>
                        <h5>{i.name} <span className="level-badge">{i.level}</span></h5>
                        <p><strong>Cause:</strong> {i.cause.slice(0, 180)}...</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Fuel Cycle Results */}
              {searchResults?.fuel.length > 0 && (
                <section className="results-group">
                  <h4><Layers size={15} /> Fuel Cycle ({searchResults.fuel.length})</h4>
                  <div className="results-list">
                    {searchResults.fuel.map((f, idx) => (
                      <article key={idx} className="search-result-card" onClick={() => { setActiveTab("fuel"); setSearchQuery(""); }}>
                        <h5>{f.title}</h5>
                        <p>{f.content.slice(0, 180)}...</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {searchResults?.total === 0 && (
                <div className="search-empty-state">
                  <Bookmark size={40} className="glow-icon" />
                  <h4>No records match your query.</h4>
                  <p>Try searching for core topics like 'fission', 'Fermi', 'Chernobyl', 'SMR', or 'cooling'.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Archive Interface */
          <div className="archive-stage">
            
            {/* Primary Tab Navigation */}
            <nav className="archive-tablist">
              <button 
                className={`archive-tab-btn ${activeTab === "eras" ? "active" : ""}`}
                onClick={() => setActiveTab("eras")}
              >
                <Clock size={16} />
                <span>Historical Eras</span>
              </button>
              
              <button 
                className={`archive-tab-btn ${activeTab === "pioneers" ? "active" : ""}`}
                onClick={() => setActiveTab("pioneers")}
              >
                <Award size={16} />
                <span>Pioneering Facilities</span>
              </button>

              <button 
                className={`archive-tab-btn ${activeTab === "incidents" ? "active" : ""}`}
                onClick={() => setActiveTab("incidents")}
              >
                <ShieldAlert size={16} />
                <span>Incidents & Safety</span>
              </button>

              <button 
                className={`archive-tab-btn ${activeTab === "fuel" ? "active" : ""}`}
                onClick={() => setActiveTab("fuel")}
              >
                <Layers size={16} />
                <span>Fuel Cycle & Waste</span>
              </button>

              <button 
                className={`archive-tab-btn ${activeTab === "sources" ? "active" : ""}`}
                onClick={() => setActiveTab("sources")}
              >
                <Bookmark size={16} />
                <span>Cited Sources</span>
              </button>
            </nav>

            <div className="tab-viewport">
              
              {/* Eras View: Sidebar selection + Scrolling reading panel */}
              {activeTab === "eras" && (
                <div className="eras-layout">
                  <aside className="eras-sidebar">
                    <span className="sidebar-title">Select Era</span>
                    <div className="era-pills">
                      {ERAS_DATA.map((era) => {
                        const EraIcon = era.icon;
                        return (
                          <button
                            key={era.id}
                            className={`era-pill ${selectedEraId === era.id ? "active" : ""}`}
                            onClick={() => setSelectedEraId(era.id)}
                          >
                            <div className="era-pill-header">
                              <EraIcon size={14} className="era-icon" />
                              <span className="era-years">{era.years}</span>
                            </div>
                            <span className="era-title">{era.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <section className="era-reading-panel">
                    <div className="reading-panel-header">
                      <div className="title-row">
                        <span className="era-years-tag">{activeEra.years}</span>
                        <h3>{activeEra.title}</h3>
                      </div>
                      <p className="era-summary-lead">{activeEra.summary}</p>
                    </div>
                    
                    <div className="reading-panel-content">
                      {activeEra.content.split("\n\n").map((para, pIdx) => (
                        <p key={pIdx} className="history-paragraph">
                          {renderFormattedText(para)}
                        </p>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* Pioneers View: Card layout */}
              {activeTab === "pioneers" && (
                <div className="pioneers-view">
                  <div className="view-intro">
                    <h3>Pioneering Nuclear Facilities</h3>
                    <p>The monumental, history-making installations that pioneered fission science, electricity generation, and grid-scale nuclear energy deployment.</p>
                  </div>
                  <div className="pioneers-grid">
                    {PIONEERS.map((p, idx) => (
                      <article key={idx} className="pioneer-card">
                        <div className="pioneer-card-glow-border" />
                        <div className="pioneer-header">
                          <span className="pioneer-year"><Calendar size={12} /> {p.year}</span>
                          <h4>{p.name}</h4>
                          <span className="pioneer-location">{p.location}</span>
                        </div>
                        <div className="pioneer-achievement-box">
                          <Award size={14} />
                          <strong>Milestone:</strong> {renderFormattedText(p.achievement)}
                        </div>
                        <p className="pioneer-details">{p.details}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Incidents & Safety View: Technical deep-dives */}
              {activeTab === "incidents" && (
                <div className="incidents-view">
                  <div className="view-intro">
                    <h3>Major Incidents & Engineering Safety</h3>
                    <p>Understanding critical nuclear plant accidents, their systemic causes, and the rigorous safety retrofits they prompted that have made modern nuclear power one of the safest electrical energy sources.</p>
                  </div>
                  
                  <div className="incidents-stack">
                    {INCIDENTS.map((i, idx) => (
                      <article key={idx} className="incident-row-card">
                        <div className="incident-header-row">
                          <div>
                            <span className="incident-date"><Calendar size={13} /> {i.date}</span>
                            <h4>{i.name}</h4>
                            <span className="incident-loc">{i.location}</span>
                          </div>
                          <span className="severity-badge">{i.level}</span>
                        </div>
                        
                        <div className="incident-details-grid">
                          <div className="detail-column">
                            <span className="column-label">Root Cause Analysis</span>
                            <p>{renderFormattedText(i.cause)}</p>
                          </div>
                          <div className="detail-column">
                            <span className="column-label">Consequences & Outcomes</span>
                            <p>{renderFormattedText(i.outcomes)}</p>
                          </div>
                        </div>

                        <div className="incident-lessons-footer">
                          <Cpu size={15} />
                          <div>
                            <strong>Safety & Engineering Lessons Learned:</strong> {i.lessons}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Fuel Cycle & Waste View: Accordion grids */}
              {activeTab === "fuel" && (
                <div className="fuel-cycle-view">
                  <div className="view-intro">
                    <h3>The Nuclear Fuel Cycle & Waste Containment</h3>
                    <p>An in-depth look at uranium fuel—from atomic extraction and reactor operation to waste pool cooling, reprocessing, and permanent underground geological isolation.</p>
                  </div>
                  
                  <div className="fuel-cycle-grid">
                    {FUEL_CYCLE_SECTIONS.map((section, idx) => (
                      <div key={idx} className="fuel-cycle-card">
                        <div className="card-top-icon">
                          <Layers size={16} />
                        </div>
                        <h4>{section.title}</h4>
                        <p>{renderFormattedText(section.content)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Bibliography View: Peer-reviewed citations */}
              {activeTab === "sources" && (
                <div className="sources-view" ref={bibliographyRef}>
                  <div className="view-intro">
                    <h3>Academic Bibliography & Citations</h3>
                    <p>All historical facts, nuclear physics findings, and incident analyses in NUC.OWN are rigorously grounded in official reports, peer-reviewed scientific papers, and international atomic agency records.</p>
                  </div>
                  
                  <div className="bibliography-list">
                    {BIBLIOGRAPHY.map((source) => (
                      <div key={source.id} id={`citation-${source.id}`} className="bibliography-row">
                        <span className="citation-num">[{source.id}]</span>
                        <p className="citation-text">{source.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Floating Citation Tooltip */}
      {hoveredCitation && (
        <div 
          className="citation-floating-tooltip"
          style={{ 
            left: `${tooltipPos.x}px`, 
            top: `${tooltipPos.y}px` 
          }}
        >
          <div className="tooltip-header">
            <Bookmark size={11} />
            <span>Citation [{hoveredCitation.number}]</span>
          </div>
          <p className="tooltip-text">{hoveredCitation.text}</p>
          <div className="tooltip-footer">Click to view source in Bibliography</div>
        </div>
      )}
    </div>
  );
}
