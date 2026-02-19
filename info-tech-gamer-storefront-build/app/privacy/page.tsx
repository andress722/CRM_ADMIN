export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 font-serif text-3xl font-bold text-foreground">Privacy Policy</h1>
      <div className="prose prose-neutral max-w-none space-y-6 text-muted-foreground [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:leading-relaxed">
        <p>
          Last updated: February 2026. This Privacy Policy describes how InfoTechGamer collects,
          uses, and protects your personal information in accordance with the Lei Geral de Protecao
          de Dados (LGPD - Law No. 13.709/2018).
        </p>

        <h2>1. Data Controller</h2>
        <p>
          InfoTechGamer is the data controller responsible for your personal data. You can contact us
          at privacy@infotechgamer.com for any questions regarding your data.
        </p>

        <h2>2. Data We Collect</h2>
        <p>We collect the following types of personal data:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and
            shipping addresses provided during registration and checkout.
          </li>
          <li>
            <strong className="text-foreground">Order Data:</strong> Purchase history, transaction details, and payment
            method (we do not store full credit card numbers).
          </li>
          <li>
            <strong className="text-foreground">Usage Data:</strong> Browsing activity, search queries, and interaction
            with our services for analytics and improvement.
          </li>
          <li>
            <strong className="text-foreground">Device Information:</strong> IP address, browser type, and device
            identifiers for security and fraud prevention.
          </li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <p>Your personal data is used for:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Processing and fulfilling your orders</li>
          <li>Providing customer support</li>
          <li>Sending transactional communications (order confirmations, shipping updates)</li>
          <li>Improving our services and user experience</li>
          <li>Fraud prevention and security</li>
          <li>Marketing communications (only with your explicit consent)</li>
        </ul>

        <h2>4. Legal Basis for Processing</h2>
        <p>
          We process your data based on: contract performance (order fulfillment), legitimate interest
          (fraud prevention, analytics), legal obligation (tax and regulatory compliance), and consent
          (marketing communications).
        </p>

        <h2>5. Data Sharing</h2>
        <p>
          We may share your data with: payment processors, shipping carriers, and cloud service
          providers necessary to operate our services. We do not sell your personal data to third
          parties.
        </p>

        <h2>6. Your Rights Under LGPD</h2>
        <p>You have the right to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Confirm the existence of data processing</li>
          <li>Access your personal data</li>
          <li>Correct incomplete, inaccurate, or outdated data</li>
          <li>Request anonymization, blocking, or deletion of unnecessary data</li>
          <li>Request data portability</li>
          <li>Withdraw consent at any time</li>
          <li>File a complaint with the National Data Protection Authority (ANPD)</li>
        </ul>

        <h2>7. Data Retention</h2>
        <p>
          We retain your personal data for as long as necessary to provide our services and comply with
          legal obligations. Account data is retained while your account is active. You may request
          deletion at any time.
        </p>

        <h2>8. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal data
          against unauthorized access, alteration, disclosure, or destruction. This includes encryption,
          access controls, and regular security audits.
        </p>

        <h2>9. Contact</h2>
        <p>
          For any questions or requests regarding your personal data, contact our Data Protection
          Officer at privacy@infotechgamer.com.
        </p>
      </div>
    </div>
  )
}
