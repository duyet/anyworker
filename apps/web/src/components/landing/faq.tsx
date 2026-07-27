import { faq } from "@/content/site"
import {
  Container,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function Faq() {
  return (
    <Section>
      <Container>
        <SectionHeader
          align="center"
          eyebrow={faq.eyebrow}
          lines={faq.headline}
        />
        <Accordion className="mx-auto mt-14 max-w-3xl">
          {faq.items.map((item) => (
            <AccordionItem key={item.q}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </Section>
  )
}
