// online consent (Georgia Tech IRB2026-66, Consent_Behavioral_2026.pdf), shown before the pre-check
// screen when SHOW_CONSENT is on. Text is the approved document verbatim; the paper signature
// block is replaced by its own "For Online Participation" clause plus the store/share choice,
// which is saved to the main CSV's share_data column (yes/no; blank when consent isn't shown).
const CONSENT_HTML = `
<p style="text-align:right; font-size:0.85em;">Georgia Institute of Technology<br>IRB2026-66<br>Approved on 2-23-2026</p>

<h2>Key Information for "Behavioral Studies of Perception"</h2>
<h3>What Am I Being Asked To Do?</h3>
<p>You are being asked to be a volunteer in a research study. This page will give you key information to help you decide if you would like to participate. Your participation is voluntary. As you read, please feel free to ask any questions you may have about the research.</p>
<h3>What Is This Study About and What Procedures Will You be Asked to Follow?</h3>
<p>The purpose of this study is to understand the mechanisms behind normal perceptual processes. If you decide to be in this study, your part may involve from one to ten visits (conducted either in-person at our laboratory or online via web-based tasks), each of which could take between one and two hours. We will discuss the study, and you may ask any questions. You will then complete the computer task. Tell the researcher if you ever want to quit the study or just need a break.</p>
<h3>Are There Any Risks or Discomforts you Might Experience by Being in this Study?</h3>
<p>The risks to your participation in this study are that you might experience mild fatigue, boredom, or eyestrain from looking at the computer monitor.</p>
<h3>What Are the Reasons You Might Want to Volunteer For This Study?</h3>
<p>You are not likely to benefit in any way from joining this study. We hope that we will learn more about the mechanisms of perception.</p>
<h3>Do You Have to Take Part in This Study?</h3>
<p>It is fully your decision if you wish to be in this study or not. If you choose not to participate, or choose to participate and later determine you no longer wish to, you will not lose any rights, services, or benefits as a result of your withdrawal. The study is completely voluntary.</p>

<hr>
<h2 style="text-align:center;">CONSENT DOCUMENT FOR ENROLLING<br>ADULT PARTICIPANTS IN A RESEARCH STUDY</h2>
<p style="text-align:center;">Georgia Institute of Technology</p>
<p><b>Project Title:</b> Behavioral Studies of Perception<br>
<b>Investigators:</b> Dr. Dobromir Rahnev, Principal Investigator<br>
<b>Contact:</b><br>Dobromir Rahnev<br>School of Psychology, Georgia Institute of Technology<br>654 Cherry Street NW<br>Atlanta, GA 30332-0170</p>
<p>You are being asked to be a volunteer in a research study.</p>

<h3>Purpose:</h3>
<p>The purpose of this study is to understand the mechanisms behind normal perceptual processes. We expect to enroll 1000 people in this study.</p>
<h3>Exclusion/Inclusion Criteria:</h3>
<p>Participants with normal or corrected-to-normal vision between 18 and 40 years of age are included in the study. Participants with color blindness will be excluded from studies that involve color stimuli.</p>
<h3>Procedures:</h3>
<p>If you decide to be in this study, your part may involve from one to ten visits, each of which could take between one and two hours. Sessions may be conducted either in-person at our laboratory or online via web-based tasks, depending on the specific experiment. We will discuss the study, and you may ask any questions. You will then complete the computer task. Tell the researcher if you ever want to quit the study or just need a break.</p>
<h3>Risks or Discomforts:</h3>
<p>The risks to your participation in this study are that you might experience mild fatigue, boredom, or eyestrain from looking at the computer monitor. We have designed the conditions of the experiment to try to minimize fatigue and eye strain. You will be given opportunities to take regular rest periods over the course of the experiment.</p>
<h3>Benefits:</h3>
<p>You are not likely to benefit in any way from joining this study. We hope that what we learn will contribute to our understanding of the mechanisms of perception.</p>
<h3>Compensation to You:</h3>
<p>The compensation for participation is in the form of course credit at the rate of 1 credit/hour. If you are unwilling or unable to complete the study, you will be compensated a prorated amount according to the time that you have spent until that moment.</p>
<h3>Storing and Sharing your Information:</h3>
<p>Your participation in this study is gratefully acknowledged. It is possible that your information/data will be enormously valuable for other research purposes. By signing below, you consent for your de-identified information/data to be stored by the researcher and to be shared with other researchers in future studie. If you agree to allow such future sharing and use, your identity will be completely separated from your information/data. Future researchers will not have a way to identify you. Any future research must be approved by an ethics committee before being undertaken.</p>
<h3>Confidentiality:</h3>
<p>The following procedures will be followed to keep your personal information confidential in this study: We will comply with any applicable laws and regulations regarding confidentiality. To protect your privacy, your records will be kept under a code number rather than by name. Your records will be kept in locked files (or password-protected electronic files for online participation) and only study staff will be allowed to look at them. Your name and any other fact that might point to you will not appear when results of this study are presented or published. Your privacy will be protected to the extent required by law. De-identified data may be shared with other researchers and included in public databases.</p>
<p>For online participation: You should be aware that some experiments may not be run from a secure https server of the kind typically used to handle credit card transactions, so there is a small possibility that responses could be viewed by unauthorized third parties such as computer hackers. The web page software may log the IP address of the machine you use to access this page, but otherwise no other information will be stored unless you explicitly enter it.</p>
<p>The Georgia Institute of Technology IRB and the Office of Human Research Protections may look over study records during required reviews.</p>
<h3>Costs to You:</h3>
<p>There are no costs to you, other than your time, for being in this study.</p>
<h3>Questions about the Study:</h3>
<p>If you have any questions about the study, you may contact Dr. Dobromir Rahnev at rahnev@psych.gatech.edu.</p>
<h3>Questions about Your Rights as a Research Participant:</h3>
<ul>
  <li>Your participation in this study is voluntary. You do not have to be in this study if you don't want to be.</li>
  <li>You have the right to change your mind and leave the study at any time without giving any reason and without penalty.</li>
  <li>Any new information that may make you change your mind about being in this study will be given to you.</li>
  <li>You will be given a copy of this consent form to keep.</li>
  <li>You do not waive any of your legal rights by signing this consent form.</li>
</ul>
<p>If you have any questions about your rights as a research participant, you may contact the Georgia Institute of Technology Office of Research Integrity Assurance at IRB@gatech.edu.</p>
`;

let SHARE_CONSENT = ''; // 'yes' / 'no' once the consent screen is answered

function showConsent(onAgree) {
  const el = document.createElement('div');
  el.id = 'consent-screen';
  el.innerHTML = `<div class="consent-doc">${CONSENT_HTML}
    <h3>Consent to Store and Share your Information:</h3>
    <label><input type="radio" name="share" value="yes"> I agree that my de-identified information/data may be stored and shared for future, unspecified research.</label>
    <label><input type="radio" name="share" value="no"> I do not allow my de-identified information/data to be stored and shared for future, unspecified research. These may only be used for this specific study.</label>
    <h3>For Online Participation:</h3>
    <p>By completing the online study, you indicate your consent to be in the study.</p>
    <p><button id="consent-copy">Download a copy of this form</button></p>
    <p><button id="consent-agree" disabled>I consent, begin the study</button>
       <button id="consent-decline">I do not consent</button></p>
  </div>`;
  document.body.appendChild(el);

  const agreeBtn = el.querySelector('#consent-agree');
  el.querySelectorAll('input[name=share]').forEach(r => r.addEventListener('change', () => { agreeBtn.disabled = false; }));
  el.querySelector('#consent-copy').addEventListener('click', () => {
    const blob = new Blob([`<!doctype html><meta charset="utf-8"><title>Consent - Behavioral Studies of Perception</title>${CONSENT_HTML}`], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'consent_behavioral_studies_of_perception.html';
    link.click();
    URL.revokeObjectURL(link.href);
  });
  agreeBtn.addEventListener('click', () => {
    SHARE_CONSENT = el.querySelector('input[name=share]:checked').value;
    el.remove();
    onAgree();
  });
  el.querySelector('#consent-decline').addEventListener('click', () => {
    el.innerHTML = '<div class="consent-doc"><p style="font-size:1.3em;">You have chosen not to participate. You may close this window.</p></div>';
  });
}
