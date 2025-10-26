import { Card, CardContent } from "@/components/ui/card";
const testimonials = [{
  name: "Priya Sharma",
  role: "B.A. Political Science",
  institution: "Delhi University",
  location: "Delhi",
  emoji: "🎓",
  quote: "Before Sarkari Khozo, I used to open so many websites just to find one government form. Half of them were full of pop-ups, ads and broken links. Now I just type the exam name, and it shows everything in one card."
}, {
  name: "Aman Tiwari",
  role: "M.Sc. Physics",
  institution: "Banaras Hindu University (BHU)",
  location: "Varanasi",
  emoji: "🎓",
  quote: "Every morning I used to scroll through Telegram, job blogs, and random sites just to check if any exam update came. Pure sardard! Sarkari Khozo changed that. Now I get proper reminders - admit card, results, all sorted automatically."
}, {
  name: "Neha Verma",
  role: "B.Com.",
  institution: "Allahabad University (AU)",
  location: "Allahabad",
  emoji: "🎓",
  quote: "Other websites like Sarkari result are just full of ads and fake links. Sarkari Khozo is clean and clear to use. Everything is written clearly — no need to jump between ten tabs & go to cafe. When I first used it, I actually said out loud: 'Yaar, this is how government updates should look!'"
}, {
  name: "Rohit Kumar",
  role: "B.A.",
  institution: "Pt. Jawahar Lal Nehru College, Banda",
  location: "U.P.",
  emoji: "🎓",
  quote: "Being from a small town, finding the right scheme or exam was always tough. Sarkari Khozo just asks for my district and shows all active yojanas and scholarships. I didn't even know half of these existed before. For people like us, this app feels like real empowerment."
}, {
  name: "Ayesha Khan",
  role: "M.A. Public Administration",
  institution: "ISDC",
  location: "Delhi",
  emoji: "🎓",
  quote: "Government sites confuse even tech people 😂 — so many PDFs and old pages. But Sarkari Khozo feels modern and simple. The AI summaries tell you everything in two lines and scan gov 10-page notices— what it is, who's eligible, and how to apply. For the first time, I actually enjoy checking schemes!"
}, {
  name: "Ravi Patel",
  role: "Farmer's Son",
  institution: "Agriculture",
  location: "Mehsana, Gujarat",
  emoji: "🌾",
  quote: "My father could never understand those government scheme websites and maybe yours too. I searched on Sarkari Khozo, it showed all Kisan Yojanas in our district, with what documents we need. It's in simple Hindi and audio too. Now even my dad opens it himself!"
}, {
  name: "Sneha Das",
  role: "Job Aspirant",
  institution: "Government Jobs",
  location: "Kolkata",
  emoji: "👩‍💼",
  quote: "বেশিরভাগ চাকরির ওয়েবসাইট ভুয়া সতর্কতা বা পুরনো পোস্ট দেখায়। সরকারী খোঁজো শুধুমাত্র সরকারী উৎস থেকে আসল সরকারি আপডেট দেয়। আমি SSC এবং UPSC ফর্মের জন্য রিমাইন্ডার সেট করেছি — এবং প্রতিবারই, এটি আমাকে সময়সীমার আগে সতর্ক করে। অবশেষে আমি আপডেট মিস করার বিষয়ে চিন্তা করা বন্ধ করে দিয়েছি।"
}, {
  name: "Deepak Yadav",
  role: "UPSC Aspirant",
  institution: "Civil Services",
  location: "Bihar",
  emoji: "🧑‍🎓",
  quote: "For UPSC prep, I used to waste time reading long official notices. Now Sarkari Khozo gives me short, clear AI summaries with eligibility and important dates. It's simple and smart — just like how an aspirant's tool should be."
}, {
  name: "Kavita Mishra",
  role: "School Teacher",
  institution: "Government School",
  location: "Jaunpur, U.P.",
  emoji: "👨‍🏫",
  quote: "Students often ask me for help with forms. Earlier, even I had to browse 4–5 websites. Now I open Sarkari Khozo, search the scheme, and everything is there — last date, documents, process. Parents in my village also started using it because it's that easy to understand."
}, {
  name: "Rakesh Chauhan",
  role: "Graduate",
  institution: "Job Seeker",
  location: "Rewa, Madhya Pradesh",
  emoji: "🧑‍💻",
  quote: "Honestly, Sarkari Khozo is like Google, but only for government forms. I don't need to run to a cyber café anymore. Everything comes in one place — clean, fast, and real. I tell everyone in my town about it."
}, {
  name: "Pooja Saini",
  role: "Small Business Owner",
  institution: "Entrepreneur",
  location: "Jaipur",
  emoji: "👩‍🌾",
  quote: "Through Sarkari Khozo, I discovered a women entrepreneur subsidy scheme. The app explained eligibility in plain Hindi and even gave a checklist of documents. I applied on my own — without any agent! I wish such a platform existed years ago."
}, {
  name: "Ankit Pandey",
  role: "B.A. Student",
  institution: "Lucknow University",
  location: "Lucknow",
  emoji: "🧠",
  quote: "Every day my WhatsApp is full of random job links and PDFs. Sarkari Khozo filters all that noise. It gives only official and verified updates. For students, it's like having a smart friend who keeps track of all government news."
}, {
  name: "Mitali Gupta",
  role: "B.A. Sociology",
  institution: "Miranda House, Delhi University",
  location: "Delhi",
  emoji: "🎓",
  quote: "We study public policies, but even we find government websites hard to read. Sarkari Khozo simplifies everything — from new schemes to education policies — and shows how they actually affect us. It's both useful and educational."
}, {
  name: "Suresh Yadav",
  role: "Parent",
  institution: "Guardian",
  location: "Gorakhpur, U.P.",
  emoji: "👨‍👩‍👧",
  quote: "Earlier, I had to visit the café to know if my son's form came out. Now Sarkari Khozo sends all updates straight to my phone. For parents like me, it's peace of mind. I can finally keep track without asking anyone."
}, {
  name: "Kiran Kumar",
  role: "NGO Worker",
  institution: "Youth Development",
  location: "Bengaluru",
  emoji: "🌍",
  quote: "Our NGO works with youth from rural areas. Sarkari Khozo helps us guide them easily — we just open the app, select their state, and show active schemes and fellowships. It saves time and builds real awareness. Hats off to you guys!"
}];
export const TestimonialsSection = () => {
  return <section className="py-16 md:py-20 px-4">
      <div className="container mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto text-slate-200">
            Real stories from students, aspirants, and families across India
          </p>
        </div>

        {/* Horizontal Scrollable Testimonials */}
        <div className="w-full overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-4 md:gap-6 pb-4 min-w-min">
            {testimonials.map((testimonial, index) => <Card key={index} className="border border-white/5 backdrop-blur-xl bg-slate-900/40 overflow-hidden w-[280px] sm:w-[320px] md:w-[380px] flex-shrink-0">
                <CardContent className="p-5 md:p-6 space-y-4 md:space-y-5">
                  {/* Quote */}
                  <blockquote className="text-xs sm:text-sm md:text-base text-slate-300/90 italic leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Author Details */}
                  <div className="space-y-1">
                    <p className="font-semibold text-white text-sm md:text-base">
                      — {testimonial.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400">
                      {testimonial.role}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      {testimonial.institution}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-600 flex items-center gap-1">
                      <span className="text-pink-500">📍</span> {testimonial.location}
                    </p>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </div>
    </section>;
};