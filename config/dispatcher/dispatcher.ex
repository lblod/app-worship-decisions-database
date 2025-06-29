defmodule Dispatcher do
  use Matcher

  define_accept_types [
    any: ["*/*"],
    turtle: ["text/turtle", "application/n-triples"],
    html: [ "text/html", "application/xhtml+html" ],
    json: [ "application/json", "application/vnd.api+json" ]
  ]

  @any %{ accept: %{ any: true } }
  @turtle %{ accept: %{ turtle: true } }
  @html %{ accept: %{ html: true } }
  @json %{ accept: %{ json: true } }

  ###############################################################
  # Registration and login
  ###############################################################

  match "/accounts/*path", @json do
    Proxy.forward conn, path, "http://resource/accounts/"
  end
  match "/gebruikers/*path", @json do
    Proxy.forward conn, path, "http://resource/gebruikers/"
  end

  match "/sessions/*path", %{ reverse_host: ["dashboard" | _rest] } do
    IO.inspect("dashboard says hello")
    Proxy.forward conn, path, "http://dashboard-login/sessions/"
  end

  match "/sessions/*path", @json do
    Proxy.forward conn, path, "http://login/sessions/"
  end

  match "/mock/sessions/*path", @json do
    Proxy.forward conn, path, "http://mocklogin/sessions/"
  end

  match "/impersonations/*path", @json do
    Proxy.forward conn, path, "http://impersonation/impersonations/"
  end

  #################################################################
  # jobs
  #################################################################
  match "/jobs/*path", @json do
    forward conn, path, "http://cache/jobs/"
  end

  match "/tasks/*path", @json do
    forward conn, path, "http://cache/tasks/"
  end

  match "/data-containers/*path", @json do
    forward conn, path, "http://cache/data-containers/"
  end

  match "/job-errors/*path", @json  do
    forward conn, path, "http://cache/job-errors/"
  end

  #################################################################
  # Reports
  #################################################################
  match "/reports/*path", @json do
    forward conn, path, "http://resource/reports/"
  end

  ###############################################################
  # General/Shared
  ###############################################################

  match "/bestuurseenheden/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuurseenheden/"
  end

  get "/werkingsgebieden/*path", @json do
    Proxy.forward conn, path, "http://cache/werkingsgebieden/"
  end

  get "/bestuurseenheid-classificatie-codes/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuurseenheid-classificatie-codes/"
  end

  get "/bestuursorganen/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuursorganen/"
  end

  get "/bestuursorgaan-classificatie-codes/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuursorgaan-classificatie-codes/"
  end

  get "/files/:id/download", @any do
    Proxy.forward conn, [], "http://file/files/" <> id <> "/download"
  end

  get "/files/*path", @json do
    Proxy.forward conn, path, "http://resource/files/"
  end


 ###############################################################
  # Searching
  ###############################################################

  get "/search-queries/*path", @json do
    Proxy.forward conn, path, "http://resource/search-queries/"
  end
  post "/search-queries/*path", @json do
    Proxy.forward conn, path, "http://resource/search-queries/"
  end
  get "/search-queries/*path", @turtle do
    Proxy.forward conn, path, "http://search-query-management/search-queries/"
  end
  put "/search-queries/*path", @turtle do
    Proxy.forward conn, path, "http://search-query-management/search-queries/"
  end
  delete "/search-queries/*path", @turtle do
    Proxy.forward conn, path, "http://search-query-management/search-queries/"
  end
  match "/search-query-forms/*path", @turtle do
    Proxy.forward conn, path, "http://search-query-management/search-query-forms/"
  end

  #################################################################
  # Submissions
  #################################################################

  get "/remote-urls/*path", @json do
    Proxy.forward conn, path, "http://cache/remote-urls/"
  end

  get "/inzendingen-voor-toezicht/*path", @json do
    Proxy.forward conn, path, "http://cache/inzendingen-voor-toezicht/"
  end

  get "/submissions/*path", @json do
    Proxy.forward conn, path, "http://cache/submissions/"
  end

  get "/authenticity-types/*path", @json do
    Proxy.forward conn, path, "http://cache/authenticity-types/"
  end

  get "/tax-types/*path", @json do
    Proxy.forward conn, path, "http://cache/tax-types/"
  end

  get "/chart-of-accounts/*path", @json do
    Proxy.forward conn, path, "http://cache/chart-of-accounts/"
  end

  get "/submission-document-statuses/*path", @json do
    Proxy.forward conn, path, "http://cache/submission-document-statuses/"
  end

  get "/submission-forms/*path", @json do
    Proxy.forward conn, path, "http://enrich-submission/submission-documents/"
  end

  get "/submission-documents/*path", @json do
    Proxy.forward conn, path, "http://cache/submission-documents/"
  end

  get "/form-data/*path", @json do
    Proxy.forward conn, path, "http://cache/form-data/"
  end

  get "/concept-schemes/*path", @json do
    Proxy.forward conn, path, "http://cache/concept-schemes/"
  end

  get "/concepts/*path", @json do
    Proxy.forward conn, path, "http://cache/concepts/"
  end

  get "/worship-decisions-cross-reference/document-information/*path" do
    forward conn, path, "http://worship-decisions-cross-reference/document-information/"
  end

  #################################################################
  # Vendor Login for SPARQL endpoint
  #################################################################

  post "/vendor/login/*path" do
    Proxy.forward conn, path, "http://vendor-login/sessions"
  end

  delete "/vendor/logout" do
    Proxy.forward conn, [], "http://vendor-login/sessions/current"
  end

  #################################################################
  # Vendor SPARQL endpoint
  #################################################################

  # Not only POST. SPARQL via GET is also allowed.
  match "/vendor/sparql" do
    Proxy.forward conn, [], "http://sparql-authorization-wrapper/sparql"
  end

  ###############################################################
  # Frontend
  ###############################################################
  get "/favicon.ico", @any do
    send_resp( conn, 404, "" )
  end

  get "/assets/*path",  %{ reverse_host: ["dashboard" | _rest] }  do
    forward conn, path, "http://frontend-dashboard/assets/"
  end

  get "/@appuniversum/*path", %{ reverse_host: ["dashboard" | _rest]} do
    forward conn, path, "http://frontend-dashboard/@appuniversum/"
  end

  match "/*_path", %{ reverse_host: ["dashboard" | _rest] } do
    # *_path allows a path to be supplied, but will not yield
    # an error that we don't use the path variable.
    forward conn, [], "http://frontend-dashboard/index.html"
  end

  match "/authorization/callback" , @html do
    # For ACM/IDM login and torii
    forward conn, [], "http://frontend/torii/redirect.html"
  end

  get "/assets/*path", @any do
    forward conn, path, "http://frontend/assets/"
  end

  get "/@appuniversum/*path", @any do
    forward conn, path, "http://frontend/@appuniversum/"
  end

  match "/*_path", @html do
    # *_path allows a path to be supplied, but will not yield
    # an error that we don't use the path variable.
    forward conn, [], "http://frontend/index.html"
  end

  #################################################################
  # Fallback
  #################################################################

  match "/*_", %{ last_call: true } do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end
end
