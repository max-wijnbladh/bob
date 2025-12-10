function createDescription(er_details) {
    prompt = "Here is a request from a sales specialist for Google Workspace on an opportunity they want support with from a customer engineer. Summarise all these details provided in natural language without any intro text, just the details: " + er_details
    er_overview = generate(prompt)
    return er_overview
}
