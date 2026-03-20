const text = 
    {
      "name": "Material Rendering",
      "severity": "CLEAR",
      "'technical_description': 'Wood grain on table, fabric texture of clothing, and metallic sheen on watch face all show realistic material properties consistent with real-world objects.'"
    }


const descriptions = [...text.matchAll(
  /(?:["']+)technical_description(?:["']+)\s*:\s*(?:["']+)([\s\S]{10,300}?)(?:["']+(?:\s*,|\s*}|\s*$))/g
)]
console.log(descriptions)

// Let's also try one where 	echnical_description is a normal JSON string inside an array
const text2 = {
  "name": "Skin Texture",
  "severity": "CLEAR",
  "technical_description": "Both hands show correct finger count, natural joint proportions, and plausible typing posture. No merged digits or anatomical anomalies detected."
}
const descriptions2 = [...text2.matchAll(
  /(?:["']+)technical_description(?:["']+)\s*:\s*(?:["']+)([\s\S]{10,300}?)(?:["']+(?:\s*,|\s*}|\s*$))/g
)]
console.log(descriptions2)

