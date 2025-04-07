from duckduckgo_search import DDGS
import logging

def search_web(query, max_results=5):
    """
    Search the web using DuckDuckGo search API and return the results.
    
    Args:
        query (str): The search query
        max_results (int): Maximum number of results to return
        
    Returns:
        list: List of search result dictionaries containing 'title', 'href', and 'body'
    """
    logging.debug(f"Searching web for: {query}")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            logging.debug(f"Found {len(results)} search results")
            return results
    except Exception as e:
        logging.error(f"Error searching web: {e}")
        return []
    
def format_results(results):
    """
    Format search results into a readable string with markdown links.
    
    Args:
        results (list): List of search result dictionaries
        
    Returns:
        str: Formatted string with search results as markdown links
    """
    if not results:
        return "No relevant resources found."
    
    formatted = []
    for i, result in enumerate(results, 1):
        try:
            title = result.get('title', 'Untitled')
            url = result.get('href', '#')
            snippet = result.get('body', '')[:150] + '...' if result.get('body') else ''
            
            # Clean the title and URL to avoid formatting issues
            title = title.replace(")", "\\)").replace("(", "\\(")
            
            # Ensure URL is properly formatted for markdown
            url = url.replace("(", "%28").replace(")", "%29").replace(" ", "%20")
            
            # Create a markdown link with title and short description
            formatted_result = f"{i}. [{title}]({url})"
            if snippet:
                formatted_result += f"\n   {snippet}"
            
            formatted.append(formatted_result)
        except Exception as e:
            # Skip problematic results
            print(f"Error formatting search result: {e}")
            continue
    
    if not formatted:
        return "Error processing search results. Please try a different query."
        
    return "\n\n".join(formatted)

def extract_search_terms(text):
    """
    Extract potential search terms from a text.
    This function could be expanded with NLP techniques.
    
    Args:
        text (str): The text to extract search terms from
        
    Returns:
        str: Extracted search terms
    """
    # This is a simplified version - in a real app, you might use
    # more sophisticated NLP techniques like entity extraction
    # or keyword extraction
    return text.lower().replace('how to', '').replace('?', '').strip()

# Only run this code when the module is executed directly
if __name__ == "__main__":
    query = "DIY spring garden projects with recycled materials"
    results = search_web(query)
    output = format_results(results)
    print(f"Search results for '{query}':\n{output}")