import React from "react"
import { Text } from "@re-do/components"
import { PostData } from "../../../common"

export const october2019Posts: PostData[] = [
    {
        title: "What founding a startup and global warming have in common",
        date: new Date(2019, 9, 16),
        caption:
            "Stuff I learned about my self from my first few months as a startup founder",
        content: (
            <>
                <Text>
                    Earlier this year I left the best job I’ve ever had working
                    on Alexa Devices to found Redo and build a better way for
                    engineers to do UI testing. I had a lot of reasons for doing
                    this, but ultimately a couple of ideas motivated the
                    decision. First, I believe that dev teams are happier and
                    more successful if they are able to focus on the unique
                    problems their organization is trying to solve. UI tests,
                    manual or automated, tend to require the same overhead work
                    from every team wanting to run them. I began to realize what
                    a huge market opportunity awaits whoever can define the next
                    paradigm for end-to-end UI testing and that the experience I
                    had was exceptionally relevant to that problem.
                </Text>
                <br />
                <Text>
                    Second, for years my personal happiness has been tied up in
                    my belief that I am doing the most I can do to help others.
                    More recently, I learned about{" "}
                    <a
                        href="https://www.effectivealtruism.org/"
                        target="_blank"
                    >
                        Effective Altruism
                    </a>
                    , which reinforced that connection as well as the idea that
                    “earning to give” (optimizing your career decisions around
                    making extra money you can donate) could be a viable path to
                    maximizing my impact.
                </Text>
                <br />
                <Text>
                    I often try to make decisions based on what I imagine I’d
                    want to have done in retrospect at some point in the future,
                    and founding Redo began to feel like an opportunity that I
                    would never forgive myself for missing. So I gave my two
                    weeks at Amazon and did what I could to prepare myself. At
                    this point, I’d read dozens of books about startups and
                    spent years meticulously tracking my time and energy. I was
                    on the verge of something I’d been building up to for most
                    of my adult life, and I felt great. I anticipated challenges
                    and acknowledged the statistical likelihood of my failure,
                    but figured that my biggest threats would be tactical:
                    competitors with more resources that could strategically
                    outmaneuver me or tech problems I couldn’t solve fast
                    enough. As it turns out, by far the hardest challenge I’ve
                    faced so far had nothing to do with knowing what to do or
                    how to do it; that vision has always felt spectacularly
                    clear. It was simply that for the first time in my life, I
                    often just felt totally miserable.
                </Text>
                <br />
                <Text>
                    At first, I didn’t want to acknowledge it. How was it
                    possible that given the chance to do something I’d been
                    working towards for years and having every reason to be
                    optimistic, most days it was a struggle to get out of bed?
                    Eventually, the stress started to manifest itself
                    physically. For the first time in my life, I was getting
                    chest pains and developing bizarre nervous habits. I’d often
                    take deep breaths hoping exhalation would feel like a
                    relief, but it just felt like there was this weight in my
                    chest that was always there.
                </Text>
                <br />
                <Text>
                    Eventually, I knew I had to take a step back from the
                    100-hour weeks I’d been putting in since June and figure out
                    what was going on. I started taking actual days off and
                    planning small trips to try and reset. But when I’d sit down
                    to get back to work, all the stress would just come rushing
                    back. It felt totally debilitating, and the combination of
                    that paralysis with the urgency of my desire to realize my
                    vision led to the most painful experiences I’ve ever had.
                </Text>
                <br />
                <Text>
                    Luckily, my wife Savannah has been an amazing support
                    through all of this and helped me maintain my belief in the
                    tractability of these problems. So I’ve continued iterating
                    on my routines and reflecting on how I ended up in this
                    situation. And that’s about where I am today. Unfortunately,
                    this isn’t a “There and Back Again” story-- yet. However, I
                    do have some hypotheses I’m interested in testing.
                </Text>
                <br />
                <Text>
                    As a solo founder, I’ve been able to bypass many of the
                    trickiest issues that most early-stage startup teams have to
                    navigate. However, I was wrong in thinking the kind of hours
                    I was working were sustainable based on passion alone.
                    Despite being naturally extraverted, my goals have led to
                    long periods of time spent with my head down, usually coding
                    and often alone save the company of Savannah and my seven
                    pets. That may have been fine when my projects had clear end
                    dates, but running a startup doesn’t. Charging your phone
                    once a day won’t work if you live in Antarctica and a day is
                    six months. To do this I’ll need sustainable sources of
                    energy that keep up with what I’m expending on a daily
                    basis, and I’m hoping this blog will be one of them.
                </Text>
                <br />
                <Text>
                    So what do founding a startup and global warming have in
                    common? They’re bad times to be an island. Were the
                    references to Antarctica and sustainability meant to throw
                    you off? Yes, so if you’re either full of resentment or just
                    here because of the post’s title, you’re free to go.
                </Text>
                <br />
                <Text>
                    For the rest of you, each day, I plan to post a brief update
                    on the company’s progress since the previous day and goals
                    for tomorrow (a lot like a daily standup for those in
                    software). Weekly, I’ll be posting something more like this
                    focused on Redo’s broader strategy, my experience as a
                    founder, or some combination of those. I hope that in
                    sharing this with friends, family, and the tech/startup
                    communities, my experiences, including and perhaps
                    especially my failures, will be informative or entertaining
                    (and hopefully not purely out of schadenfreude). Moreover,
                    I’d encourage anyone with questions about Redo, founding a
                    startup, Effective Altruism, bow ties, or anything else they
                    read about to reach out (my contact info can be found at the
                    bottom of the page). In doing so, in addition to some small
                    chance of a genuinely helpful response, you will have helped
                    the road I’m on feel a little less lonely. And when that
                    road is all you can see, that feels like a very big deal.
                </Text>
            </>
        )
    },
    {
        title: "Time for a Redo",
        date: new Date(2019, 9, 28),
        caption: "How the way we test our software is holding it back",
        content: (
            <>
                <Text>
                    When an engineer writes or updates code, there is some
                    chance the changes work exactly as intended in every
                    situation and a much higher chance something is broken.
                    Luckily, there is an expectation that new code is tested
                    before being released to users. Sometimes, testing is fast
                    and easy; if you're building a button that changes colors
                    when you click on it, you can have a very high degree of
                    confidence as to whether or not it's working in a minute or
                    less. Over time, the amount a team needs to test scales sort
                    of like this:
                </Text>
                <br />
                <Text>
                    <i>Complexity × Update frequency = Testing required</i>
                </Text>
                <br />
                <Text>
                    So just limit those two factors and you're in the clear
                    right? Well, yes, so long as you're building something small
                    and predictable. If you just want to throw together a
                    personal website, testing probably won't be a big problem
                    for you. However, if you're building a product that needs to
                    grow and evolve to meet the needs of your users, complexity
                    is bound to go up. Historically, companies could compensate
                    by only updating big products like Microsoft Word once a
                    year. They'd still have a lot to test, but if they only had
                    to do it annually it wasn't such a big deal. That paradigm
                    would be short-lived, however, as just a few years later the
                    internet would fundamentally and irrevocably change the way
                    software was consumed.
                </Text>
                <br />
                <Text>
                    Full disclosure, I was in elementary school at this point
                    and too preoccupied with building the ultimate Magic the
                    Gathering deck and learning obscure baseball statics to
                    notice or care that any of this was happening, so this is
                    all second-hand. On the plus side, I'm starting to think
                    it's possible I've actually become less nerdy over time, if
                    only just.
                </Text>
                <br />
                <Text>
                    Anyways, the internet. Companies start to realize they can
                    get a big advantage by updating their software in real time
                    as they learn more about what their customers want. If
                    Company A can release a critical feature its users need
                    within a week of receiving feedback while Company B's users
                    are stuck waiting a full year, Company A will have a huge
                    advantage, even if the initial version of the product they
                    release is significantly worse. So subscriptions providing
                    access to frequent updates (
                    <a
                        href="https://en.wikipedia.org/wiki/Software_as_a_service"
                        target="_blank"
                    >
                        SAAS
                    </a>
                    ) displaced one-time purchases as the standard for
                    delivering software and we all lived happily ever after.
                    Only problem is, SAAS apps are:
                </Text>
                <br />
                <Text>
                    1) Complex
                    <br />
                    2) Updated frequently
                    <br />
                </Text>
                <br />
                <Text>
                    So, if you recall how we determine the amount of time a team
                    needs to spend testing, we've put ourselves firmly in "a
                    lot" territory.
                </Text>
            </>
        )
    }
]
