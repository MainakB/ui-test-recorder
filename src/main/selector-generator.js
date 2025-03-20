class SelectorGenerator {
  constructor() {
    this.preferredAttributes = [
      "id",
      "name",
      "data-testid",
      "data-cy",
      "data-test",
    ];
  }

  async generateSelector(element) {
    // Priority order:
    // 1. ID
    // 2. Specific attributes like data-testid, data-cy, name
    // 3. CSS class
    // 4. Tag + text content
    // 5. XPath as fallback

    const selectors = [];

    // ID selector
    if (element.id) {
      selectors.push({
        type: "css",
        value: `#${element.id}`,
        confidence: 100,
      });
    }

    // Attribute selectors
    if (element.attributes) {
      for (const attr of this.preferredAttributes) {
        const attribute = element.attributes.find((a) => a.name === attr);
        if (attribute) {
          selectors.push({
            type: "css",
            value: `[${attr}="${attribute.value}"]`,
            confidence: 90,
          });
        }
      }
    }

    // Class selector (if not too generic)
    if (element.className) {
      const classes = element.className.split(" ").filter(Boolean);
      if (classes.length === 1 && !classes[0].startsWith("_")) {
        selectors.push({
          type: "css",
          value: `.${classes[0]}`,
          confidence: 70,
        });
      } else if (classes.length > 0) {
        // Use the first few classes
        const combinedClasses = classes
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join("");
        selectors.push({
          type: "css",
          value: `${element.tagName.toLowerCase()}${combinedClasses}`,
          confidence: 60,
        });
      }
    }

    // Tag + content selector (for elements with text)
    if (element.textContent && element.textContent.trim()) {
      const text = element.textContent.trim().substring(0, 20);
      if (text.length > 5) {
        // Only use text if meaningful
        selectors.push({
          type: "xpath",
          value: `//${element.tagName.toLowerCase()}[contains(text(), "${text}")]`,
          confidence: 50,
        });
      }
    }

    // Tag + position (fallback)
    selectors.push({
      type: "xpath",
      value: this.generateXPathByPosition(element),
      confidence: 20,
    });

    // Sort by confidence and return the best selector
    selectors.sort((a, b) => b.confidence - a.confidence);
    return selectors[0] ? [selectors[0]] : [];
  }

  generateXPathByPosition(element) {
    // This is a simplified version - in a real implementation,
    // we would compute the path based on the element's position
    // in the DOM tree
    return `//${element.tagName.toLowerCase()}`;
  }
}

module.exports = SelectorGenerator;
