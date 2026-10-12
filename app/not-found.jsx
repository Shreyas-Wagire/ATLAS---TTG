import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";

const sampleSlots = [
    ["MON", "9:15", "Lecture", "indigo"],
    ["TUE", "11:30", "Open slot", "mint"],
    ["WED", "2:15", "Practical", "amber"],
];

export default function NotFound() {
    return (
        <main className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#f6f8f7] px-5 py-12 text-[#263b36] sm:px-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#dff2e9]/70 blur-3xl" />
                <div className="absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#e9e6f7]/70 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#78958b_0.7px,transparent_0.7px)] [background-size:22px_22px]" />
            </div>

            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
                <section>
                    <Link href="/" className="inline-flex items-center gap-2.5 rounded-full border border-[#dce8e2] bg-white/80 px-3.5 py-2 shadow-sm transition hover:border-[#b5d1c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#1e1b4b] text-[11px] font-black tracking-tight text-white">A</span>
                        <span className="text-xs font-extrabold tracking-[0.15em] text-[#294943]">ATLAS</span>
                    </Link>

                    <p className="mt-12 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0d8276]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0d9b86]" /> Route not found
                    </p>
                    <h1 className="mt-4 max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[#1e1b4b] sm:text-7xl">
                        This page has a gap.
                    </h1>
                    <p className="mt-5 max-w-lg text-sm leading-7 text-[#61736d] sm:text-base">
                        The link may be out of date, or the page may have moved. Let’s get you back to your timetable workspace.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link href="/" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-[#1e1b4b] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(30,27,75,0.18)] transition hover:-translate-y-0.5 hover:bg-[#302a70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2">
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            Back to ATLAS
                        </Link>
                        <span className="inline-flex items-center gap-2 px-2 text-[11px] font-semibold text-[#82918c]">
                            <span className="h-1 w-1 rounded-full bg-[#a7b5af]" /> Error 404
                        </span>
                    </div>
                </section>

                <section aria-label="Decorative timetable preview" className="relative mx-auto w-full max-w-md lg:max-w-none">
                    <div aria-hidden="true" className="absolute -left-8 top-10 h-24 w-24 rounded-[2rem] border border-white/80 bg-white/40 rotate-12" />
                    <div className="relative rounded-[2rem] border border-white bg-white/85 p-5 shadow-[0_28px_80px_rgba(40,65,57,0.12)] backdrop-blur-sm sm:p-7">
                        <div className="flex items-center justify-between border-b border-[#edf1ef] pb-5">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef6f2] text-[#0d8276]"><CalendarDays className="h-5 w-5" /></div>
                                <div><p className="text-xs font-extrabold text-[#294943]">Schedule overview</p><p className="mt-1 text-[10px] font-medium text-[#93a19b]">A fresh start is one click away</p></div>
                            </div>
                            <span className="rounded-full bg-[#f1eff9] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#6257a4]">ATLAS</span>
                        </div>

                        <div className="mt-5 flex items-end justify-between">
                            <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#94a29d]">Weekly view</p><p className="mt-1 text-lg font-extrabold tracking-tight text-[#263b36]">Your next session</p></div>
                            <Clock3 className="mb-1 h-4 w-4 text-[#9aa9a3]" />
                        </div>

                        <div className="mt-4 space-y-2.5">
                            {sampleSlots.map(([day, time, label, tone]) => (
                                <div key={day} className="grid grid-cols-[42px_48px_1fr] items-center gap-3 rounded-2xl border border-[#edf1ef] bg-white px-3 py-3">
                                    <span className="text-[9px] font-extrabold tracking-wide text-[#82918c]">{day}</span>
                                    <span className="text-[10px] font-semibold text-[#9aa7a2]">{time}</span>
                                    <span className={`rounded-xl px-3 py-2 text-[10px] font-bold ${tone === "indigo" ? "bg-[#f0eff9] text-[#51458f]" : tone === "mint" ? "bg-[#eaf5ef] text-[#35725b]" : "bg-[#fbf3e6] text-[#9b7131]"}`}>{label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#f7f9f8] px-4 py-3">
                            <span className="text-[10px] font-semibold text-[#899791]">Back to the schedule builder</span>
                            <ArrowUpRight className="h-4 w-4 text-[#0d8276]" />
                        </div>
                    </div>
                    <div aria-hidden="true" className="absolute -bottom-5 -right-3 -z-10 h-32 w-32 rounded-[2rem] bg-[#dfeee7] rotate-6" />
                </section>
            </div>
        </main>
    );
}
