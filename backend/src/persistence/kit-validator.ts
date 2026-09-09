export interface KitValidationResult {
  valid: boolean;
  errors: string[];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/**
 * Structural validation against Appendix A. Hand-rolled rather than a schema
 * library — the shape is small and stable, and this keeps errors specific.
 */
export function validateKitStructure(kit: any): KitValidationResult {
  const errors: string[] = [];
  const require = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };

  require(!!kit && typeof kit === "object", "kit must be an object");
  if (!kit || typeof kit !== "object") return { valid: false, errors };

  require(!!kit.source && typeof kit.source === "object", "source is required");
  if (kit.source) {
    require(isString(kit.source.company), "source.company must be a string");
    require(isString(kit.source.company_url), "source.company_url must be a string");
    require(isString(kit.source.role), "source.role must be a string");
    require(isString(kit.source.location), "source.location must be a string");
    require(typeof kit.source.jd_chars === "number", "source.jd_chars must be a number");
    require(isString(kit.source.researched_at), "source.researched_at must be a string");
    require(isStringArray(kit.source.pages_used), "source.pages_used must be a string[]");
  }

  require(!!kit.company_brief && typeof kit.company_brief === "object", "company_brief is required");
  if (kit.company_brief) {
    require(isString(kit.company_brief.summary), "company_brief.summary must be a string");
    require(isString(kit.company_brief.what_they_do), "company_brief.what_they_do must be a string");
    require(isStringArray(kit.company_brief.sources), "company_brief.sources must be a string[]");
  }

  require(!!kit.role && typeof kit.role === "object", "role is required");
  const requirementIds = new Set<string>();
  if (kit.role) {
    require(isString(kit.role.title), "role.title must be a string");
    require(isString(kit.role.seniority), "role.seniority must be a string");
    require(isStringArray(kit.role.responsibilities), "role.responsibilities must be a string[]");
    require(Array.isArray(kit.role.requirements), "role.requirements must be an array");

    if (Array.isArray(kit.role.requirements)) {
      kit.role.requirements.forEach((requirement: any, index: number) => {
        require(isString(requirement?.id), `role.requirements[${index}].id must be a string`);
        require(isString(requirement?.text), `role.requirements[${index}].text must be a string`);
        require(
          ["technical", "behavioral", "domain"].includes(requirement?.kind),
          `role.requirements[${index}].kind must be technical | behavioral | domain`
        );
        require(
          ["must", "nice"].includes(requirement?.priority),
          `role.requirements[${index}].priority must be must | nice`
        );
        if (isString(requirement?.id)) requirementIds.add(requirement.id);
      });
    }
  }

  require(Array.isArray(kit.questions), "questions must be an array");
  const questionIds = new Set<string>();
  if (Array.isArray(kit.questions)) {
    kit.questions.forEach((question: any, index: number) => {
      require(isString(question?.id), `questions[${index}].id must be a string`);
      require(isStringArray(question?.requirement_ids), `questions[${index}].requirement_ids must be a string[]`);
      require(
        ["technical", "behavioral", "domain", "system-design", "company-fit"].includes(question?.category),
        `questions[${index}].category is invalid`
      );
      require(isString(question?.prompt), `questions[${index}].prompt must be a string`);
      require(isString(question?.answer_outline), `questions[${index}].answer_outline must be a string`);
      require([1, 2, 3].includes(question?.difficulty), `questions[${index}].difficulty must be 1, 2, or 3`);

      question?.requirement_ids?.forEach((requirementId: string) => {
        require(requirementIds.has(requirementId), `questions[${index}] references unknown requirement id ${requirementId}`);
      });

      if (isString(question?.id)) questionIds.add(question.id);
    });
  }

  require(Array.isArray(kit.flashcards), "flashcards must be an array");
  if (Array.isArray(kit.flashcards)) {
    kit.flashcards.forEach((flashcard: any, index: number) => {
      require(isString(flashcard?.id), `flashcards[${index}].id must be a string`);
      require(isString(flashcard?.front), `flashcards[${index}].front must be a string`);
      require(isString(flashcard?.back), `flashcards[${index}].back must be a string`);
      require(isStringArray(flashcard?.requirement_ids), `flashcards[${index}].requirement_ids must be a string[]`);
    });
  }

  require(!!kit.schedule && typeof kit.schedule === "object", "schedule is required");
  if (kit.schedule) {
    require(Number.isInteger(kit.schedule.days_available), "schedule.days_available must be an integer");
    require(kit.schedule.days_available > 0, "schedule.days_available must be greater than 0");
    require(Array.isArray(kit.schedule.days), "schedule.days must be an array");

    if (Array.isArray(kit.schedule.days)) {
      require(
        kit.schedule.days.length === kit.schedule.days_available,
        "schedule.days length must equal schedule.days_available"
      );

      const seenDays = new Set<number>();
      kit.schedule.days.forEach((day: any) => {
        if (Number.isInteger(day?.day)) seenDays.add(day.day);
      });
      require(seenDays.size === kit.schedule.days.length, "schedule day numbers must be unique");

      if (kit.schedule.days.length > 0) {
        const expectedDays = new Set(
          Array.from({ length: kit.schedule.days_available }, (_, index) => index + 1)
        );
        require(
          seenDays.size === expectedDays.size &&
            [...expectedDays].every((dayNumber) => seenDays.has(dayNumber)),
          "schedule day numbers must cover 1..days_available"
        );
      }

      kit.schedule.days.forEach((day: any, index: number) => {
        require(typeof day?.day === "number", `schedule.days[${index}].day must be a number`);
        require(isString(day?.focus), `schedule.days[${index}].focus must be a string`);
        require(isStringArray(day?.question_ids), `schedule.days[${index}].question_ids must be a string[]`);
        require(Number.isInteger(day?.minutes), `schedule.days[${index}].minutes must be an integer`);

        day?.question_ids?.forEach((questionId: string) => {
          require(questionIds.has(questionId), `schedule.days[${index}] references unknown question id ${questionId}`);
        });
      });
    }
  }

  require(!!kit.coverage && typeof kit.coverage === "object", "coverage is required");
  if (kit.coverage) {
    require(isStringArray(kit.coverage.uncovered_requirement_ids), "coverage.uncovered_requirement_ids must be a string[]");
    require(typeof kit.coverage.passes === "number", "coverage.passes must be a number");
  }

  return { valid: errors.length === 0, errors };
}